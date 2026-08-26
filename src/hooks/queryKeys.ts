import type { HistoryRange } from "../types/device";

export const queryKeys = {
  devices: () => ["devices"] as const,
  status: (deviceId: string) => ["device", deviceId, "status"] as const,
  sensors: (deviceId: string) => ["device", deviceId, "sensors"] as const,
  settings: (deviceId: string) => ["device", deviceId, "settings"] as const,
  history: (deviceId: string, range: HistoryRange) => ["device", deviceId, "history", range] as const,
  events: (deviceId: string) => ["device", deviceId, "events"] as const,
  alerts: (deviceId?: string) => (deviceId ? (["alerts", deviceId] as const) : (["alerts"] as const)),
};
