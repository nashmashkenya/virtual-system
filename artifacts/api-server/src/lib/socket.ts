import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "url";
import {
  sessionsStore,
  attendanceStore,
  enrollmentsStore,
  buildDashboard,
} from "../routes/teacher";

interface ActiveConnection {
  socket: WebSocket;
  roomCode: string;
  username: string;
  role: "student" | "teacher";
  channel: "events" | "signals";
}

const activeConnections = new Set<ActiveConnection>();

export function initWebSocketServer(wss: WebSocketServer) {
  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    const parsedUrl = parse(req.url ?? "", true);
    const pathname = parsedUrl.pathname ?? "";

    // Match path `/ws/classrooms/:roomCode/`
    const match = pathname.match(/^\/ws\/classrooms\/([^/]+)\/?$/);
    if (!match) {
      socket.close(4400, "Invalid connection path");
      return;
    }

    const roomCode = match[1];
    const { username, role, channel } = parsedUrl.query as {
      username?: string;
      role?: "student" | "teacher";
      channel?: "events" | "signals";
    };

    if (
      !username ||
      !role ||
      !channel ||
      !["student", "teacher"].includes(role) ||
      !["events", "signals"].includes(channel)
    ) {
      socket.close(4400, "Missing or invalid parameters");
      return;
    }

    const connection: ActiveConnection = {
      socket,
      roomCode,
      username,
      role: role as "student" | "teacher",
      channel: channel as "events" | "signals",
    };

    activeConnections.add(connection);

    // If student connects to events channel, update presence to "Present"
    if (role === "student" && channel === "events") {
      updateStudentPresence(roomCode, username, true);
    }

    // If teacher connects to events channel, send them an initial dashboard snapshot
    if (role === "teacher" && channel === "events") {
      const sessionId = getSessionIdByRoomCode(roomCode);
      if (sessionId !== undefined) {
        socket.send(
          JSON.stringify({
            dashboard: buildDashboard(sessionId, sessionsStore.get(sessionId)),
            enrollments: enrollmentsStore.get(sessionId) ?? [],
            session: sessionsStore.get(sessionId),
          })
        );
      }
    }

    socket.on("message", (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (channel === "signals" && data.type === "signal") {
          relaySignal(connection, data);
        }
      } catch (err) {
        // Ignore malformed payloads
      }
    });

    socket.on("close", () => {
      activeConnections.delete(connection);

      // If student disconnects from events, mark attendance as Pending
      if (role === "student" && channel === "events") {
        updateStudentPresence(roomCode, username, false);
      }

      // If student disconnects from signals, notify teacher WebRTC channels
      if (role === "student" && channel === "signals") {
        relaySignal(connection, {
          type: "signal",
          target_role: "teacher",
          payload: { kind: "viewer_left", media: "screen" },
        });
        relaySignal(connection, {
          type: "signal",
          target_role: "teacher",
          payload: { kind: "viewer_left", media: "audio" },
        });
        relaySignal(connection, {
          type: "signal",
          target_role: "teacher",
          payload: { kind: "viewer_left", media: "camera" },
        });
      }
    });
  });
}

function getSessionIdByRoomCode(roomCode: string): number | undefined {
  for (const [id, session] of sessionsStore.entries()) {
    if (session.room_code === roomCode) {
      return id;
    }
  }
  return undefined;
}

function updateStudentPresence(roomCode: string, username: string, isConnected: boolean) {
  const sessionId = getSessionIdByRoomCode(roomCode);
  if (sessionId === undefined) return;

  const list = attendanceStore.get(sessionId) ?? [];
  const enrollments = enrollmentsStore.get(sessionId) ?? [];
  const enrollment = enrollments.find((e: any) => e.username === username);

  if (!enrollment) return;

  const idx = list.findIndex((a) => a.student_id === enrollment.student_id);
  const status = isConnected ? "Present" : "Pending";
  const joined_at = isConnected ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

  if (idx >= 0) {
    list[idx].status = status;
    list[idx].joined_at = joined_at;
  } else {
    // If not found in attendance sheet, push it
    list.push({
      student_id: enrollment.student_id,
      name: enrollment.full_name,
      status,
      joined_at,
      payment: "Paid",
    });
  }

  attendanceStore.set(sessionId, list);

  // Notify the teacher on events channel of the attendance change
  broadcastToTeacher(roomCode, {
    dashboard: buildDashboard(sessionId, sessionsStore.get(sessionId)),
    enrollments: enrollmentsStore.get(sessionId) ?? [],
    session: sessionsStore.get(sessionId),
  });
}

function relaySignal(sender: ActiveConnection, data: any) {
  const targetRole = data.target_role;
  const targetUsername = data.target_username;
  const signalPayload = data.payload;

  for (const conn of activeConnections) {
    if (
      conn.roomCode === sender.roomCode &&
      conn.channel === "signals" &&
      conn.role === targetRole
    ) {
      // If target is teacher, relay to any teacher in the same room
      // If target is student, match targetUsername
      if (targetRole === "teacher" || conn.username === targetUsername) {
        if (conn.socket.readyState === WebSocket.OPEN) {
          conn.socket.send(
            JSON.stringify({
              type: "signal",
              source_username: sender.username,
              source_role: sender.role,
              payload: signalPayload,
            })
          );
        }
      }
    }
  }
}

export function broadcastToTeacher(roomCode: string, payload: any) {
  for (const conn of activeConnections) {
    if (conn.roomCode === roomCode && conn.role === "teacher" && conn.channel === "events") {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(payload));
      }
    }
  }
}

export function broadcastToStudents(roomCode: string, payload: any) {
  for (const conn of activeConnections) {
    if (conn.roomCode === roomCode && conn.role === "student" && conn.channel === "events") {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(payload));
      }
    }
  }
}

export function broadcastToAll(roomCode: string, payload: any) {
  for (const conn of activeConnections) {
    if (conn.roomCode === roomCode && conn.channel === "events") {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(payload));
      }
    }
  }
}
