
import { useCallback, useEffect, useRef, useState } from "react";
import { buildRealtimeUrl } from "@/hooks/use-classroom-realtime";
import type { ClassroomSignalMessage, ClassroomSignalOutboundMessage, RealtimeRole } from "@/lib/types";

type SignalingStatus = "connecting" | "connected" | "disconnected";

export function useClassroomSignaling({
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
  onMessage: (message: ClassroomSignalMessage) => void;
}) {
  const [status, setStatus] = useState<SignalingStatus>(
    enabled && roomCode ? "connecting" : "disconnected",
  );
  const onMessageRef = useRef(onMessage);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !roomCode) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    let isActive = true;
    let reconnectTimeoutId: number | null = null;
    let reconnectAttempts = 0;

    const pingIntervalId = window.setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    const connect = () => {
      if (!isActive) {
        return;
      }

      setStatus("connecting");
      const socket = new WebSocket(buildRealtimeUrl(roomCode, username, role, accessToken, "signals"));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        if (isActive) {
          setStatus("connected");
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as ClassroomSignalMessage | { type: "pong" };
          if (payload && typeof payload === "object" && "type" in payload && payload.type === "signal") {
            onMessageRef.current(payload);
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onerror = () => {
        socket.close();
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
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [accessToken, enabled, role, roomCode, username]);

  const sendMessage = useCallback((message: ClassroomSignalOutboundMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }

    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  return {
    status: enabled && roomCode ? status : "disconnected",
    sendMessage,
  };
}
