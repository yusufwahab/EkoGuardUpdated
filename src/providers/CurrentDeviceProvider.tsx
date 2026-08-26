import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDevices } from "../hooks/useDevices";
import { queryKeys } from "../hooks/queryKeys";
import { wsUrlFor } from "../lib/deviceTransport";
import type { DeviceSnapshot, RawDeviceLivePayload, Transport } from "../types/device";

interface CurrentDeviceContextValue {
  deviceId: string | null;
  device: DeviceSnapshot | undefined;
  devices: DeviceSnapshot[];
  selectDevice: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Whether the live feed for the current device is coming straight from
   *  the ESP32 or relayed through the backend (see docs/device-api.md). */
  liveTransport: Transport | "connecting";
}

const CurrentDeviceContext = createContext<CurrentDeviceContextValue | null>(null);

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 20_000;

function rawPayloadToSnapshot(base: DeviceSnapshot, payload: RawDeviceLivePayload): DeviceSnapshot {
  return {
    ...base,
    fillLevel: payload.fillLevel,
    distanceCm: payload.distanceCm,
    fan: payload.fanStatus,
    mode: payload.mode,
    connection: "local",
    lastUpdated: payload.timestamp ?? new Date().toISOString(),
    stale: false,
    transport: "direct",
  };
}

/**
 * Opens a WebSocket straight to the ESP32 (no backend hop) for the current
 * device, and falls back to "relayed" (the backend's own WS, already wired
 * up in SocketProvider, keeps delivering to the same query key regardless)
 * whenever the direct connection can't be established - e.g. the frontend
 * is served over HTTPS and the device only speaks plain WS/HTTP, which the
 * browser blocks as mixed content before this even reaches the network.
 */
function useDirectDeviceSocket(device: DeviceSnapshot | undefined): Transport | "connecting" {
  const queryClient = useQueryClient();
  const [transport, setTransport] = useState<Transport | "connecting">("connecting");
  const reconnectDelay = useRef(RECONNECT_BASE_MS);

  // Kept out of the effect's deps on purpose: `device` gets a new identity
  // every time the 20s device-list poll resolves, even when baseUrl/id
  // haven't changed - depending on it directly would reconnect the socket
  // needlessly every 20s. The ref always has the latest object for the
  // (rare) case a message arrives before any status query has populated
  // the cache yet. Updated via its own effect, never during render.
  const deviceRef = useRef(device);
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  const baseUrl = device?.baseUrl;
  const deviceId = device?.deviceId;

  useEffect(() => {
    if (!baseUrl || !deviceId) return; // no device selected yet - state already defaults to "connecting"

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function connect() {
      setTransport((current) => (current === "direct" ? current : "connecting"));
      try {
        socket = new WebSocket(wsUrlFor(baseUrl!));
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        reconnectDelay.current = RECONNECT_BASE_MS;
        setTransport("direct");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as RawDeviceLivePayload;
          queryClient.setQueryData(queryKeys.status(deviceId!), (prev: DeviceSnapshot | undefined) =>
            rawPayloadToSnapshot(prev ?? deviceRef.current!, payload)
          );
        } catch (err) {
          console.error("[direct-socket] malformed message from device:", err);
        }
      };

      socket.onclose = () => {
        socket = null;
        if (cancelled) return;
        setTransport("relayed"); // the backend's own relay (SocketProvider) keeps this query key fresh in the meantime
        scheduleReconnect();
      };

      socket.onerror = () => socket?.close();
    }

    function scheduleReconnect() {
      reconnectTimer = setTimeout(connect, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_MS);
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [baseUrl, deviceId, queryClient]);

  return transport;
}

/**
 * Single source of truth for "which bin is the user looking at". Even
 * though there's one physical device today, every page reads through this
 * rather than hardcoding an id, so the multi-bin list (Devices page) can
 * switch the whole app's context with one click.
 */
export function CurrentDeviceProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, refetch } = useDevices();
  const [manualSelection, setManualSelection] = useState<string | null>(null);

  // Derived during render rather than synced via an effect: falls back to
  // the first registered device until the user picks one explicitly.
  const devices = data?.devices ?? [];
  const deviceId = manualSelection ?? devices[0]?.deviceId ?? null;
  const device = devices.find((d) => d.deviceId === deviceId);

  const liveTransport = useDirectDeviceSocket(device);

  return (
    <CurrentDeviceContext.Provider
      value={{ deviceId, device, devices, selectDevice: setManualSelection, isLoading, isError, refetch, liveTransport }}
    >
      {children}
    </CurrentDeviceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook co-location is intentional; see ThemeProvider/ToastProvider for the same pattern.
export function useCurrentDevice() {
  const ctx = useContext(CurrentDeviceContext);
  if (!ctx) throw new Error("useCurrentDevice must be used within CurrentDeviceProvider");
  return ctx;
}
