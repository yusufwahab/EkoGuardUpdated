import type {
  AlertsResponse,
  DeviceMode,
  DeviceSensors,
  DeviceSettings,
  DeviceSnapshot,
  EventsResponse,
  HistoryRange,
  HistoryResponse,
} from "../types/device";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? `Request to ${path} failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  listDevices: () => request<{ devices: DeviceSnapshot[] }>("/api/devices"),

  getStatus: (deviceId: string) => request<DeviceSnapshot>(`/api/devices/${deviceId}/status`),

  getSensors: (deviceId: string) => request<DeviceSensors>(`/api/devices/${deviceId}/sensors`),

  setFan: (deviceId: string, on: boolean) =>
    request<DeviceSnapshot>(`/api/devices/${deviceId}/fan/${on ? "on" : "off"}`, { method: "POST" }),

  setMode: (deviceId: string, mode: DeviceMode) =>
    request<DeviceSnapshot>(`/api/devices/${deviceId}/mode`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),

  getSettings: (deviceId: string) => request<{ device: DeviceSettings }>(`/api/devices/${deviceId}/settings`),

  updateSettings: (deviceId: string, changes: Partial<Pick<DeviceSettings, "name" | "location" | "base_url" | "fill_alert_threshold" | "fan_max_runtime_minutes">>) =>
    request<{ device: DeviceSettings; warning?: string }>(`/api/devices/${deviceId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

  getHistory: (deviceId: string, range: HistoryRange) =>
    request<HistoryResponse>(`/api/devices/${deviceId}/history?range=${range}`),

  getEvents: (deviceId: string, limit = 100) =>
    request<EventsResponse>(`/api/devices/${deviceId}/events?limit=${limit}`),

  getAlerts: (deviceId?: string, limit = 100) =>
    request<AlertsResponse>(`/api/alerts?${deviceId ? `deviceId=${deviceId}&` : ""}limit=${limit}`),

  ackAlert: (id: number) => request<{ alert: unknown }>(`/api/alerts/${id}/ack`, { method: "POST" }),
};

export const WS_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:4000/ws";
