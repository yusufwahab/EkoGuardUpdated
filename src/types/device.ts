// Mirrors backend/src/types/device.ts, which mirrors the real ESP32 firmware
// contract documented in docs/device-api.md. Keep all three in sync.

export type DeviceMode = "automatic" | "manual";
export type ConnectionState = "local" | "cloud-cached" | "offline";

/** How the last successful read/command for this device was actually carried out. */
export type Transport = "direct" | "relayed";

export interface DeviceSnapshot {
  deviceId: string;
  name: string;
  location: string | null;
  /** The device's own local address, e.g. "http://esp32-a1b2c3.local" - lets
   *  the frontend talk to it directly instead of through the backend. */
  baseUrl: string;
  /** Always exactly -1 (unknown), 0, 25, 50, 75, or 100 - the 4 side-mounted
   *  tripwire sensors report discrete milestones, not a continuous value. */
  fillLevel: number;
  distanceCm: number;
  fan: boolean;
  mode: DeviceMode;
  connection: ConnectionState;
  lastUpdated: string; // ISO timestamp
  stale: boolean;
  /** Frontend-computed, not sent by the backend: how this snapshot was obtained. */
  transport?: Transport;
}

/** GET /api/status on the device itself (raw firmware shape, no name/location/connection). */
export interface RawDeviceStatus {
  online: boolean;
  /** Always exactly -1, 0, 25, 50, 75, or 100 (see DeviceSnapshot). */
  fillLevel: number;
  distanceCm: number;
  fan: boolean;
  mode: DeviceMode;
}

/** Pushed over the device's own WebSocket (ws://<device>/ws) - raw firmware shape. */
export interface RawDeviceLivePayload {
  deviceId: string;
  fillLevel: number;
  distanceCm: number;
  fanStatus: boolean;
  mode: DeviceMode;
  timestamp: string | null;
}

/** One of the 4 side-mounted tripwire sensors, bottom (25%) to top (100%). */
export interface TierReading {
  percent: 25 | 50 | 75 | 100;
  distanceCm: number;
  tripped: boolean;
  ok: boolean;
}

export interface DeviceSensors {
  tiers: TierReading[];
  fillLevel: number;
  distanceCm: number;
}

export interface ReadingPoint {
  fill_level: number | null;
  distance_cm: number | null;
  fan_status: boolean | null;
  mode: DeviceMode | null;
  recorded_at: string;
}

export type HistoryRange = "hour" | "day" | "week";

export interface HistoryResponse {
  range: HistoryRange;
  cloudConfigured: boolean;
  readings: ReadingPoint[];
}

export type FanEventTrigger = "manual" | "automatic";

export interface DeviceEvent {
  kind: "fan" | "mode";
  id: number;
  device_id: string;
  occurred_at: string;
  action?: "on" | "off";
  trigger?: FanEventTrigger;
  mode?: DeviceMode;
}

export interface EventsResponse {
  cloudConfigured: boolean;
  events: DeviceEvent[];
}

export type AlertType = "fill_threshold" | "offline" | "fan_runtime";
export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertRecord {
  id: number;
  device_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  occurred_at: string;
}

export interface AlertsResponse {
  cloudConfigured: boolean;
  alerts: AlertRecord[];
}

export interface DeviceSettings {
  id: string;
  name: string;
  location: string | null;
  base_url: string;
  fill_alert_threshold: number;
  fan_max_runtime_minutes: number;
  created_at: string;
}

/** Live push from the backend's own WebSocket (ws://<backend>/ws). */
export type BackendSocketMessage =
  | { type: "hello" }
  | { type: "device:update"; deviceId: string; snapshot: DeviceSnapshot }
  | { type: "alert"; deviceId: string; alertType: AlertType; severity: AlertSeverity; message: string };
