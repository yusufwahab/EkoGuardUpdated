import { AlertTriangle, Boxes, Ruler, Clock, Wifi, Server } from "lucide-react";
import { useCurrentDevice } from "../providers/CurrentDeviceProvider";
import { useDeviceStatus, useSetFan, useSetMode } from "../hooks/useDeviceStatus";
import { useAlerts } from "../hooks/useAlerts";
import { useToast } from "../providers/ToastProvider";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { Gauge } from "../components/Gauge";
import { FanIndicator } from "../components/FanIndicator";
import { WeatherCard } from "../components/WeatherCard";
import { ApiError } from "../api/client";
import type { DeviceSnapshot, Transport } from "../types/device";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0 || iso === new Date(0).toISOString()) return "never";
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

/** How the live feed is actually reaching this browser right now - the
 *  direct-vs-relayed distinction the "no middleman when possible" design
 *  is built around (see CurrentDeviceProvider / lib/deviceTransport.ts). */
function TransportBadge({ transport }: { transport: Transport | "connecting" }) {
  if (transport === "connecting") return null;
  const direct = transport === "direct";
  return (
    <span className="flex items-center gap-1 text-xs text-ink-400" title={direct ? "Talking to the device directly over your local network" : "Relayed through the backend - the device isn't directly reachable from this browser"}>
      {direct ? <Wifi className="h-3 w-3" /> : <Server className="h-3 w-3" />}
      {direct ? "Direct" : "Via backend"}
    </span>
  );
}

function DeviceDashboard({ device }: { device: DeviceSnapshot }) {
  const { liveTransport } = useCurrentDevice();
  const { data: status, isPending, isError, error, refetch } = useDeviceStatus(device);
  const { data: alertsData } = useAlerts(device.deviceId);
  const setFan = useSetFan(device);
  const setMode = useSetMode(device);
  const { toast } = useToast();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;
  }

  const isManual = status.mode === "manual";
  const openAlerts = alertsData?.alerts.filter((a) => !a.acknowledged).slice(0, 3) ?? [];

  async function handleFanToggle() {
    try {
      await setFan.mutateAsync(!status!.fan);
    } catch (err) {
      toast({
        title: "Couldn't change fan state",
        description: err instanceof ApiError ? err.message : "The device didn't respond.",
        variant: "danger",
      });
    }
  }

  async function handleModeChange(mode: "automatic" | "manual") {
    try {
      await setMode.mutateAsync(mode);
      toast({ title: `Switched to ${mode} mode`, variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't change mode",
        description: err instanceof ApiError ? err.message : "The device didn't respond.",
        variant: "danger",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">{status.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
            <Clock className="h-3.5 w-3.5" /> Updated {relativeTime(status.lastUpdated)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TransportBadge transport={status.transport ?? liveTransport} />
          <ConnectionBadge connection={status.connection} stale={status.stale} />
        </div>
      </div>

      {openAlerts.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <CardBody className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div className="space-y-1 text-sm">
              {openAlerts.map((a) => (
                <p key={a.id} className="text-amber-900 dark:text-amber-100">
                  {a.message}
                </p>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Fill level</h2>
            <Badge variant={status.mode === "automatic" ? "success" : "info"}>{status.mode}</Badge>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <Gauge value={status.fillLevel} />
            <div className="w-full max-w-xs space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800/50">
                <span className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <Ruler className="h-4 w-4" /> Distance
                </span>
                <span className="font-medium tabular-nums text-ink-900 dark:text-ink-50">
                  {status.distanceCm >= 0 ? `${status.distanceCm.toFixed(1)} cm` : "—"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={status.mode === "automatic" ? "primary" : "secondary"}
                  className="flex-1"
                  onClick={() => handleModeChange("automatic")}
                  disabled={setMode.isPending}
                >
                  Automatic
                </Button>
                <Button
                  size="sm"
                  variant={status.mode === "manual" ? "primary" : "secondary"}
                  className="flex-1"
                  onClick={() => handleModeChange("manual")}
                  disabled={setMode.isPending}
                >
                  Manual
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Ventilation fan</h2>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-5">
            <FanIndicator on={status.fan} size={40} />
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {status.fan ? "Currently running" : "Currently off"}
            </p>
            <Button
              variant={status.fan ? "danger" : "primary"}
              className="w-full"
              disabled={!isManual || setFan.isPending}
              loading={setFan.isPending}
              onClick={handleFanToggle}
            >
              Turn {status.fan ? "off" : "on"}
            </Button>
            {!isManual && (
              <p className="text-center text-xs text-ink-400">
                Switch to manual mode to control the fan directly.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <WeatherCard />
    </div>
  );
}

export function Dashboard() {
  const { device, isLoading, isError, devices, refetch } = useCurrentDevice();

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState message="Couldn't reach the backend." onRetry={refetch} />;
  if (!device || devices.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No bins registered yet"
        description="Once the backend's device registry has at least one bin, it'll show up here."
      />
    );
  }

  return <DeviceDashboard device={device} />;
}
