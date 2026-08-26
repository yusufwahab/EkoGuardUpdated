import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "./queryKeys";

export function useAlerts(deviceId?: string) {
  return useQuery({
    queryKey: queryKeys.alerts(deviceId),
    queryFn: () => api.getAlerts(deviceId),
  });
}

export function useAckAlert(deviceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.ackAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts(deviceId) }),
  });
}
