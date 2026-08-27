// Mirrors the real ESP32 firmware contract documented in docs/device-api.md.
// Keep this in sync with esp32/src/api_wifi.cpp - it is the source of truth.

export type DeviceMode = "automatic" | "manual";

/** GET /api/status on the device */
export interface DeviceStatus {
  online: boolean;
  /** Always exactly -1 (unknown), 0, 25, 50, 75, or 100 - the 4 side-mounted
   *  tripwire sensors report discrete milestones, not a continuous value. */
  fillLevel: number;
  distanceCm: number;
  fan: boolean;
  mode: DeviceMode;
}

/** One of the 4 side-mounted tripwire sensors, bottom (25%) to top (100%). */
export interface TierReading {
  percent: 25 | 50 | 75 | 100;
  distanceCm: number;
  tripped: boolean;
  ok: boolean;
}

/** GET /api/sensors on the device */
export interface DeviceSensors {
  tiers: TierReading[];
  fillLevel: number;
  distanceCm: number;
}

/** Pushed over the device's WebSocket (ws://<device>/ws) */
export interface DeviceLivePayload {
  deviceId: string;
  fillLevel: number;
  distanceCm: number;
  fanStatus: boolean;
  mode: DeviceMode;
  timestamp: string | null; // null until the device's NTP sync completes
}

export interface DeviceErrorBody {
  error: string;
}

/**
 * Backend's own view of a device, layered on top of the raw firmware
 * contract: adds the staleness/connection info the brief requires so the
 * frontend always knows whether it's looking at live local data or a
 * last-known-good cached snapshot.
 */
export type ConnectionState = "local" | "cloud-cached" | "offline";

export interface DeviceSnapshot {
  deviceId: string;
  name: string;
  location: string | null;
  /** The device's own local address (mDNS name or IP), e.g. "http://esp32-a1b2c3.local".
   *  Lets the frontend talk to the device directly, falling back to this
   *  backend's proxy routes only when direct access fails. */
  baseUrl: string;
  fillLevel: number;
  distanceCm: number;
  fan: boolean;
  mode: DeviceMode;
  connection: ConnectionState;
  lastUpdated: string; // ISO timestamp - device time if available, else backend receipt time
  stale: boolean;
}
