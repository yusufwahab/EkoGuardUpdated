import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { WS_URL } from "../api/client";
import { useToast } from "./ToastProvider";
import { queryKeys } from "../hooks/queryKeys";
import type { AlertSeverity, AlertType, BackendSocketMessage } from "../types/device";

export type SocketStatus = "connecting" | "open" | "closed";

const SocketContext = createContext<{ status: SocketStatus } | null>(null);

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

function alertTitle(type: AlertType): string {
  switch (type) {
    case "fill_threshold":
      return "Bin nearly full";
    case "offline":
      return "Device offline";
    case "fan_runtime":
      return "Fan running long";
  }
}

function severityToVariant(severity: AlertSeverity) {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "info" as const;
}

/**
 * One shared WebSocket connection to the backend for the whole app: pushes
 * live device snapshots straight into the React Query cache (so useQuery
 * consumers update instantly without waiting on their poll interval) and
 * surfaces alerts as toasts the moment the backend's alert engine fires.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const reconnectDelay = useRef(RECONNECT_BASE_MS);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function handleMessage(message: BackendSocketMessage) {
      if (message.type === "device:update") {
        queryClient.setQueryData(queryKeys.status(message.deviceId), message.snapshot);
      } else if (message.type === "alert") {
        toast({
          title: alertTitle(message.alertType),
          description: message.message,
          variant: severityToVariant(message.severity),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.alerts() });
      }
    }

    function connect() {
      setStatus("connecting");
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        reconnectDelay.current = RECONNECT_BASE_MS;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data as string) as BackendSocketMessage);
        } catch (err) {
          console.error("[socket] malformed message from backend:", err);
        }
      };

      socket.onclose = () => {
        setStatus("closed");
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_MS);
      };

      socket.onerror = () => socket?.close();
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient, toast]);

  return <SocketContext.Provider value={{ status }}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook co-location is intentional.
export function useSocketStatus(): SocketStatus {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocketStatus must be used within SocketProvider");
  return ctx.status;
}
