
import { useEffect, useRef, useState } from "react";

type RealtimeRole = "student" | "teacher";
type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function buildRealtimeUrl(
  roomCode: string,
  username: string,
  role: RealtimeRole,
  accessToken?: string,
  channel: "events" | "signals" = "events",
) {
  const baseUrl =
    import.meta.env.VITE_EDUSTREAM_WS_BASE_URL ??
    import.meta.env.VITE_EDUSTREAM_API_BASE_URL ??
    window.location.origin;
  const url = new URL(baseUrl, window.location.origin);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/classrooms/${roomCode}/`;
  url.searchParams.set("username", username);
  url.searchParams.set("role", role);
  url.searchParams.set("channel", channel);
  if (accessToken) {
    url.searchParams.set("token", accessToken);
  }

  return url.toString();
}

export function useClassroomRealtime<T>({
  roomCode,
  username,
  role,
  accessToken,
  enabled = true,
  onMessage,
}: {
  roomCode: string | null;
  username: string;
  role: RealtimeRole;
  accessToken?: string;
  enabled?: boolean;
  onMessage: (message: T) => void;
}) {
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled && roomCode ? "connecting" : "disconnected",
  );
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !roomCode) {
      return;
    }

    let isActive = true;
    let reconnectTimeoutId: number | null = null;
    let reconnectAttempts = 0;
    let socket: WebSocket | null = null;

    const pingIntervalId = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    const connect = () => {
      if (!isActive) {
        return;
      }

      setStatus("connecting");
      socket = new WebSocket(buildRealtimeUrl(roomCode, username, role, accessToken, "events"));

      socket.onopen = () => {
        reconnectAttempts = 0;
        if (isActive) {
          setStatus("connected");
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as T | { type: "pong" };
          if (payload && typeof payload === "object" && "type" in payload && payload.type === "pong") {
            return;
          }

          onMessageRef.current(payload as T);
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (!isActive) {
          return;
        }

        setStatus("disconnected");
        reconnectAttempts += 1;
        reconnectTimeoutId = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** (reconnectAttempts - 1), 10000),
        );
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }
      window.clearInterval(pingIntervalId);
      socket?.close();
    };
  }, [accessToken, enabled, role, roomCode, username]);

  return enabled && roomCode ? status : "disconnected";
}
