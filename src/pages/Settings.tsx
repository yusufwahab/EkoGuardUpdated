import { useState, type FormEvent, type ReactNode } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useCurrentDevice } from "../providers/CurrentDeviceProvider";
import { useDeviceSettings, useUpdateSettings } from "../hooks/useSettings";
import { useToast } from "../providers/ToastProvider";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { ApiError } from "../api/client";
import type { DeviceSettings } from "../types/device";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-eco-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50";

/**
 * Rendered only once `device` has actually loaded, so every field can
 * initialize its state directly from it - no effect needed to "sync" data
 * in after the fact. The parent keys this by device.id, so switching bins
 * remounts it fresh instead of leaving stale field values behind.
 */
function SettingsFields({ device, deviceId }: { device: DeviceSettings; deviceId: string }) {
  const update = useUpdateSettings(deviceId);
  const { toast } = useToast();

  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location ?? "");
  const [threshold, setThreshold] = useState(device.fill_alert_threshold);
  const [maxRuntime, setMaxRuntime] = useState(device.fan_max_runtime_minutes);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await update.mutateAsync({
        name,
        location: location.trim() === "" ? null : location,
        fill_alert_threshold: threshold,
        fan_max_runtime_minutes: maxRuntime,
      });
      toast({ title: "Settings saved", description: result.warning, variant: result.warning ? "warning" : "success" });
    } catch (err) {
      toast({
        title: "Couldn't save settings",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "danger",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Device info</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Name">
            <input className={inputClasses} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </Field>
          <Field label="Location" hint="Optional - e.g. a street or facility name.">
            <input className={inputClasses} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={160} />
          </Field>
          <Field label="Device ID">
            <input className={`${inputClasses} opacity-60`} value={device.id} disabled />
          </Field>
          <Field label="Address" hint="Set via DEVICE_BASE_URL / the devices table on the backend.">
            <input className={`${inputClasses} opacity-60`} value={device.base_url} disabled />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Automation rules</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label={`Fill alert threshold - ${threshold}%`} hint="An alert fires once fill level reaches this percentage.">
            <input
              type="range"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-eco-600"
            />
          </Field>
          <Field label="Max fan runtime (minutes)" hint="An alert fires if the fan runs continuously past this.">
            <input
              type="number"
              min={1}
              max={1440}
              className={inputClasses}
              value={maxRuntime}
              onChange={(e) => setMaxRuntime(Number(e.target.value))}
            />
          </Field>
        </CardBody>
      </Card>

      <Button type="submit" loading={update.isPending}>
        Save changes
      </Button>
    </form>
  );
}

function DeviceSettingsForm({ deviceId }: { deviceId: string }) {
  const { data, isPending, isError, error, refetch } = useDeviceSettings(deviceId);

  if (isPending) return <Skeleton className="h-96" />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;

  return <SettingsFields key={data.device.id} device={data.device} deviceId={deviceId} />;
}

export function Settings() {
  const { deviceId, isLoading } = useCurrentDevice();

  if (isLoading) return <Skeleton className="h-96" />;
  if (!deviceId) return <EmptyState icon={SettingsIcon} title="No bin selected" />;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">Device settings</h1>
      <DeviceSettingsForm deviceId={deviceId} />
    </div>
  );
}
