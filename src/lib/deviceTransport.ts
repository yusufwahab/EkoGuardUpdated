import type { DeviceSnapshot, RawDeviceStatus, Transport } from "../types/device";

const DIRECT_TIMEOUT_MS = 2500;

/**
 * Talks straight to the ESP32 on the local network - no backend involved.
 * This is the primary path: the browser and the device are expected to be
 * on the same Wi-Fi, exactly like a normal fetch() to any local web server.
 *
 * It fails fast and predictably in the cases that matter:
 * - device genuinely unreachable (wrong network, powered off) -> timeout
 * - frontend served over HTTPS (e.g. Vercel) trying to reach a plain-HTTP
 *   local device -> the browser blocks it as mixed content before this
 *   code even runs a request; the fetch() throws immediately.
 * Callers should always have a backend-relayed fallback ready (see
 * hooks/useDeviceStatus.ts, useDeviceStatus.ts's mutations) for exactly
 * this situation - deployed on Vercel/Render, viewer not on the bin's LAN.
 */
async function directFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal, mode: "cors" });
    if (!res.ok) throw new Error(`Device responded with ${res.status}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export function wsUrlFor(baseUrl: string): string {
  return baseUrl.replace(/^http/, "ws") + "/ws";
}

function fromRawStatus(base: DeviceSnapshot, raw: RawDeviceStatus): DeviceSnapshot {
  return {
    ...base,
    fillLevel: raw.fillLevel,
    distanceCm: raw.distanceCm,
    fan: raw.fan,
    mode: raw.mode,
    connection: "local",
    lastUpdated: new Date().toISOString(),
    stale: false,
    transport: "direct",
  };
}

/**
 * Tries the device directly first; on any failure, falls back to the
 * backend-relayed equivalent. Returns the result tagged with which
 * transport actually succeeded, so the UI can show it.
 */
export async function getStatusDirectOrRelayed(
  device: DeviceSnapshot,
  relayed: () => Promise<DeviceSnapshot>
): Promise<DeviceSnapshot> {
  try {
    const res = await directFetch(device.baseUrl, "/api/status");
    return fromRawStatus(device, (await res.json()) as RawDeviceStatus);
  } catch {
    const snapshot = await relayed();
    return { ...snapshot, transport: "relayed" };
  }
}

export async function setFanDirectOrRelayed(
  device: DeviceSnapshot,
  on: boolean,
  relayed: () => Promise<DeviceSnapshot>
): Promise<DeviceSnapshot> {
  try {
    const res = await directFetch(device.baseUrl, `/api/fan/${on ? "on" : "off"}`, { method: "POST" });
    return fromRawStatus(device, (await res.json()) as RawDeviceStatus);
  } catch {
    const snapshot = await relayed();
    return { ...snapshot, transport: "relayed" as Transport };
  }
}

export async function setModeDirectOrRelayed(
  device: DeviceSnapshot,
  mode: RawDeviceStatus["mode"],
  relayed: () => Promise<DeviceSnapshot>
): Promise<DeviceSnapshot> {
  try {
    const res = await directFetch(device.baseUrl, "/api/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    return fromRawStatus(device, (await res.json()) as RawDeviceStatus);
  } catch {
    const snapshot = await relayed();
    return { ...snapshot, transport: "relayed" as Transport };
  }
}
