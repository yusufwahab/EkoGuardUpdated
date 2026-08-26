import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "./queryKeys";
import type { HistoryRange } from "../types/device";

export function useHistory(deviceId: string, range: HistoryRange) {
  return useQuery({
    queryKey: queryKeys.history(deviceId, range),
    queryFn: () => api.getHistory(deviceId, range),
  });
}

export function useEvents(deviceId: string) {
  return useQuery({
    queryKey: queryKeys.events(deviceId),
    queryFn: () => api.getEvents(deviceId),
  });
}
