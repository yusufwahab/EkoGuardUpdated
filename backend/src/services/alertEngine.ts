import { supabase, syncToSupabase } from "./supabase.js";
import type { DeviceRecord, AlertSeverity, AlertType } from "../types/domain.js";
import type { DeviceSnapshot } from "../types/device.js";

const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // don't re-fire the same alert type more than once per 15min

type AlertListener = (deviceId: string, type: AlertType, severity: AlertSeverity, message: string) => void;

class AlertEngine {
  private lastFired = new Map<string, number>(); // key: `${deviceId}:${type}`
  private fanOnSince = new Map<string, number>(); // deviceId -> Date.now() when fan turned on
  private listeners: AlertListener[] = [];

  onAlert(fn: AlertListener) {
    this.listeners.push(fn);
  }

  private fire(deviceId: string, type: AlertType, severity: AlertSeverity, message: string) {
    const key = `${deviceId}:${type}`;
    const last = this.lastFired.get(key) ?? 0;
    if (Date.now() - last < ALERT_COOLDOWN_MS) return;
    this.lastFired.set(key, Date.now());

    for (const listener of this.listeners) listener(deviceId, type, severity, message);

    void syncToSupabase(`insert alert (${type})`, (db) =>
      db.from("alerts").insert({ device_id: deviceId, type, severity, message })
    );
  }

  /** Call on every fresh live snapshot for a device. */
  evaluate(device: DeviceRecord, snapshot: DeviceSnapshot) {
    if (snapshot.fillLevel >= device.fill_alert_threshold) {
      this.fire(
        device.id,
        "fill_threshold",
        snapshot.fillLevel >= 95 ? "critical" : "warning",
        `${device.name} is ${snapshot.fillLevel}% full (alert threshold: ${device.fill_alert_threshold}%).`
      );
    }

    const key = device.id;
    if (snapshot.fan) {
      if (!this.fanOnSince.has(key)) this.fanOnSince.set(key, Date.now());
      const runningMinutes = (Date.now() - this.fanOnSince.get(key)!) / 60_000;
      if (runningMinutes >= device.fan_max_runtime_minutes) {
        this.fire(
          device.id,
          "fan_runtime",
          "warning",
          `${device.name}'s fan has been running for over ${device.fan_max_runtime_minutes} minutes.`
        );
      }
    } else {
      this.fanOnSince.delete(key);
    }
  }

  /** Call when a device transitions from reachable to offline. */
  markOffline(device: DeviceRecord) {
    this.fire(device.id, "offline", "critical", `${device.name} has gone offline.`);
  }
}

export const alertEngine = new AlertEngine();

export async function listRecentAlerts(deviceId?: string, limit = 100) {
  if (!supabase) return [];
  let query = supabase.from("alerts").select("*").order("occurred_at", { ascending: false }).limit(limit);
  if (deviceId) query = query.eq("device_id", deviceId);
  const { data, error } = await query;
  if (error) {
    console.error("[alertEngine] failed to list alerts:", error);
    return [];
  }
  return data;
}
