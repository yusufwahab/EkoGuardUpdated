import type { DeviceMode, DeviceSensors, DeviceStatus } from "../types/device.js";

const REQUEST_TIMEOUT_MS = 3000;

export class DeviceUnreachableError extends Error {
  constructor(baseUrl: string, cause?: unknown) {
    super(`Device at ${baseUrl} did not respond in time`);
    this.name = "DeviceUnreachableError";
    this.cause = cause;
  }
}

export class DeviceRejectedError extends Error {
  constructor(public status: number, public body: string) {
    super(`Device rejected request with ${status}: ${body}`);
    this.name = "DeviceRejectedError";
  }
}

async function deviceFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(new URL(path, baseUrl), { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new DeviceRejectedError(res.status, body);
    }
    return res;
  } catch (err) {
    if (err instanceof DeviceRejectedError) throw err;
    throw new DeviceUnreachableError(baseUrl, err);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Thin client over the real ESP32 firmware contract (docs/device-api.md).
 * Every call can throw DeviceUnreachableError (timeout/network) or
 * DeviceRejectedError (device responded with a 4xx, e.g. fan control while
 * in automatic mode) - callers decide how to degrade for each case.
 */
export class DeviceClient {
  constructor(private baseUrl: string) {}

  async getStatus(): Promise<DeviceStatus> {
    const res = await deviceFetch(this.baseUrl, "/api/status");
    return (await res.json()) as DeviceStatus;
  }

  async getSensors(): Promise<DeviceSensors> {
    const res = await deviceFetch(this.baseUrl, "/api/sensors");
    return (await res.json()) as DeviceSensors;
  }

  async setFan(on: boolean): Promise<DeviceStatus> {
    const res = await deviceFetch(this.baseUrl, `/api/fan/${on ? "on" : "off"}`, { method: "POST" });
    return (await res.json()) as DeviceStatus;
  }

  async setMode(mode: DeviceMode): Promise<DeviceStatus> {
    const res = await deviceFetch(this.baseUrl, "/api/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    return (await res.json()) as DeviceStatus;
  }

  get wsUrl(): string {
    return this.baseUrl.replace(/^http/, "ws") + "/ws";
  }
}
