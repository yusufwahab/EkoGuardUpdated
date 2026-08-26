import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "./queryKeys";

/** Registry overview - multi-bin ready even though today there is one device. */
export function useDevices() {
  return useQuery({
    queryKey: queryKeys.devices(),
    queryFn: api.listDevices,
    refetchInterval: 20_000,
  });
}
