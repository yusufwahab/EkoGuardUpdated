import { Wifi, CloudCog, WifiOff } from "lucide-react";
import { Badge } from "./ui/Badge";
import type { ConnectionState } from "../types/device";

const CONFIG: Record<ConnectionState, { label: string; icon: typeof Wifi; variant: "success" | "info" | "danger" }> = {
  local: { label: "Local network", icon: Wifi, variant: "success" },
  "cloud-cached": { label: "Cloud synced", icon: CloudCog, variant: "info" },
  offline: { label: "Offline", icon: WifiOff, variant: "danger" },
};

/**
 * Always-visible indicator of whether the user is looking at live local
 * data, a last-synced cloud snapshot, or nothing at all - core to the
 * product's local-first resilience story.
 */
export function ConnectionBadge({ connection, stale }: { connection: ConnectionState; stale: boolean }) {
  const { label, icon: Icon, variant } = CONFIG[connection];
  return (
    <Badge variant={variant}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {stale && connection !== "offline" && <span className="opacity-70">· stale</span>}
    </Badge>
  );
}
