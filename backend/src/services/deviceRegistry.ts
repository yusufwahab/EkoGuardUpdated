import { env } from "../config/env.js";
import { supabase } from "./supabase.js";
import type { DeviceRecord } from "../types/domain.js";

/**
 * Multi-bin-ready device registry. Backed by the `devices` Supabase table
 * when cloud is configured; falls back to a single device built from env
 * vars otherwise (or if Supabase is unreachable) so local operation never
 * depends on the cloud being up.
 */
class DeviceRegistry {
  private devices = new Map<string, DeviceRecord>();
  private loaded = false;

  private fallbackDevice(): DeviceRecord {
    return {
      id: env.DEVICE_ID,
      name: "EkoGuard bin",
      location: null,
      base_url: env.DEVICE_BASE_URL,
      fill_alert_threshold: 85,
      fan_max_runtime_minutes: 120,
      created_at: new Date(0).toISOString(),
    };
  }

  async load(): Promise<void> {
    if (!supabase) {
      this.devices.set(env.DEVICE_ID, this.fallbackDevice());
      this.loaded = true;
      return;
    }

    const { data, error } = await supabase.from("devices").select("*");
    if (error || !data || data.length === 0) {
      if (error) console.error("[deviceRegistry] failed to load from Supabase, using env fallback:", error);
      this.devices.set(env.DEVICE_ID, this.fallbackDevice());
    } else {
      for (const row of data as DeviceRecord[]) {
        this.devices.set(row.id, row);
      }
    }
    this.loaded = true;
  }

  list(): DeviceRecord[] {
    return [...this.devices.values()];
  }

  get(deviceId: string): DeviceRecord | undefined {
    return this.devices.get(deviceId);
  }

  /** The single device to use until multi-bin UI actually needs a picker. */
  primary(): DeviceRecord {
    return this.devices.get(env.DEVICE_ID) ?? this.devices.values().next().value ?? this.fallbackDevice();
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /** Updates the in-memory copy (called after a successful Supabase write, or directly when cloud isn't configured). */
  patch(deviceId: string, changes: Partial<DeviceRecord>) {
    const existing = this.devices.get(deviceId);
    if (!existing) return;
    this.devices.set(deviceId, { ...existing, ...changes });
  }
}

export const deviceRegistry = new DeviceRegistry();
