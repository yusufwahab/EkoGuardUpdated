import { AlertTriangle, BellOff, CheckCheck, WifiOff, Gauge as GaugeIcon, Fan } from "lucide-react";
import clsx from "clsx";
import { useCurrentDevice } from "../providers/CurrentDeviceProvider";
import { useAckAlert, useAlerts } from "../hooks/useAlerts";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import type { AlertRecord, AlertSeverity, AlertType } from "../types/device";

const TYPE_ICON: Record<AlertType, typeof AlertTriangle> = {
  fill_threshold: GaugeIcon,
  offline: WifiOff,
  fan_runtime: Fan,
};

const SEVERITY_VARIANT: Record<AlertSeverity, "warning" | "danger" | "info"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

function AlertRow({ alert, onAck, acking }: { alert: AlertRecord; onAck: () => void; acking: boolean }) {
  const Icon = TYPE_ICON[alert.type];
  return (
    <li className={clsx("flex items-start gap-3 p-4", alert.acknowledged && "opacity-60")}>
      <div
        className={clsx(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          alert.severity === "critical" && "bg-red-100 text-danger dark:bg-red-950/50",
          alert.severity === "warning" && "bg-amber-100 text-warning dark:bg-amber-950/50",
          alert.severity === "info" && "bg-sky-100 text-info dark:bg-sky-950/50"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[alert.severity]}>{alert.severity}</Badge>
          <span className="text-xs text-ink-400">{new Date(alert.occurred_at).toLocaleString()}</span>
        </div>
        <p className="text-sm text-ink-800 dark:text-ink-100">{alert.message}</p>
      </div>
      {!alert.acknowledged && (
        <Button size="sm" variant="secondary" onClick={onAck} loading={acking}>
          Acknowledge
        </Button>
      )}
    </li>
  );
}

export function Alerts() {
  const { deviceId, isLoading: deviceLoading } = useCurrentDevice();
  const { data, isPending, isError, refetch } = useAlerts(deviceId ?? undefined);
  const ack = useAckAlert(deviceId ?? undefined);

  if (deviceLoading || isPending) return <Skeleton className="h-96" />;
  if (isError) return <ErrorState message="Couldn't load alerts." onRetry={() => refetch()} />;

  if (!data.cloudConfigured) {
    return (
      <EmptyState
        icon={BellOff}
        title="Cloud sync not configured"
        description="Connect Supabase on the backend to start persisting alerts here. Live alerts still show as toasts while connected."
      />
    );
  }

  if (data.alerts.length === 0) {
    return <EmptyState icon={CheckCheck} title="All clear" description="No alerts have fired for this bin." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">Alerts</h1>
      <Card>
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {data.alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert as AlertRecord}
              acking={ack.isPending && ack.variables === alert.id}
              onAck={() => ack.mutate(alert.id)}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

