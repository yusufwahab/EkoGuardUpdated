import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "./queryKeys";
import type { DeviceSettings } from "../types/device";

export function useDeviceSettings(deviceId: string) {
  return useQuery({
    queryKey: queryKeys.settings(deviceId),
    queryFn: () => api.getSettings(deviceId),
  });
}

type SettingsPatch = Partial<Pick<DeviceSettings, "name" | "location" | "fill_alert_threshold" | "fan_max_runtime_minutes">>;

export function useUpdateSettings(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: SettingsPatch) => api.updateSettings(deviceId, changes),
    onSuccess: (result) => queryClient.setQueryData(queryKeys.settings(deviceId), { device: result.device }),
  });
}
