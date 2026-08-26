import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "./queryKeys";
import { getStatusDirectOrRelayed, setFanDirectOrRelayed, setModeDirectOrRelayed } from "../lib/deviceTransport";
import type { DeviceMode, DeviceSnapshot } from "../types/device";

/**
 * Primary live-status read. Tries the ESP32 directly first (see
 * lib/deviceTransport.ts), falling back to the backend's proxy route only
 * if that fails - e.g. deployed on Vercel/Render and the viewer isn't on
 * the bin's local network. The direct WebSocket (see CurrentDeviceProvider)
 * pushes fresher snapshots into this same query key as they arrive, so
 * refetchInterval here is just the safety net.
 */
export function useDeviceStatus(device: DeviceSnapshot) {
  return useQuery({
    queryKey: queryKeys.status(device.deviceId),
    queryFn: () => getStatusDirectOrRelayed(device, () => api.getStatus(device.deviceId)),
    refetchInterval: 15_000,
  });
}

export function useSetFan(device: DeviceSnapshot) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => setFanDirectOrRelayed(device, on, () => api.setFan(device.deviceId, on)),
    onSuccess: (snapshot) => queryClient.setQueryData(queryKeys.status(device.deviceId), snapshot),
  });
}

export function useSetMode(device: DeviceSnapshot) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: DeviceMode) => setModeDirectOrRelayed(device, mode, () => api.setMode(device.deviceId, mode)),
    onSuccess: (snapshot) => queryClient.setQueryData(queryKeys.status(device.deviceId), snapshot),
  });
}
