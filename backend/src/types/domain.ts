import type { DeviceMode } from "./device.js";

/** Row shape of the `devices` table (see db/migrations). */
export interface DeviceRecord {
  id: string; // matches the firmware-derived deviceId, e.g. "esp32-a1b2c3"
  name: string;
  location: string | null;
  base_url: string; // e.g. http://esp32-a1b2c3.local
  fill_alert_threshold: number;
  fan_max_runtime_minutes: number;
  created_at: string;
}

export interface ReadingRecord {
  id: number;
  device_id: string;
  fill_level: number | null;
  distance_cm: number | null;
  fan_status: boolean | null;
  mode: DeviceMode | null;
  recorded_at: string;
}

export type FanEventTrigger = "manual" | "automatic";

export interface FanEventRecord {
  id: number;
  device_id: string;
  action: "on" | "off";
  trigger: FanEventTrigger;
  occurred_at: string;
}

export interface ModeEventRecord {
  id: number;
  device_id: string;
  mode: DeviceMode;
  occurred_at: string;
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
