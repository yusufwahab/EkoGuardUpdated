import type { ConnectionState, DeviceSnapshot } from "../types/device.js";

interface CacheEntry {
  snapshot: DeviceSnapshot;
  updatedAt: number; // Date.now() of last successful live read
}

const STALE_AFTER_MS = 30_000; // no live reading in 30s -> treat cached data as stale

/**
 * Last-known-good snapshot per device. This is what makes "keep working
 * (serving cached last-known state) if the ESP32 ... is briefly unreachable"
 * possible: every route reads through here rather than failing outright
 * when a device poll/WS message doesn't arrive.
 */
class StateCache {
  private entries = new Map<string, CacheEntry>();

  set(deviceId: string, snapshot: DeviceSnapshot) {
    this.entries.set(deviceId, { snapshot, updatedAt: Date.now() });
  }

  get(deviceId: string): DeviceSnapshot | undefined {
    const entry = this.entries.get(deviceId);
    if (!entry) return undefined;

    const staleByAge = Date.now() - entry.updatedAt > STALE_AFTER_MS;
    const connection: ConnectionState = staleByAge ? "offline" : entry.snapshot.connection;

    return { ...entry.snapshot, stale: staleByAge || entry.snapshot.stale, connection };
  }
}

export const stateCache = new StateCache();
