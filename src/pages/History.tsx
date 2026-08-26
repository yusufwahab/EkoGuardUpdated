import { useState } from "react";
import { Fan, Power, LineChart as LineChartIcon } from "lucide-react";
import clsx from "clsx";
import { useCurrentDevice } from "../providers/CurrentDeviceProvider";
import { useHistory, useEvents } from "../hooks/useHistory";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { HistoryChart } from "../components/charts/HistoryChart";
import type { HistoryRange } from "../types/device";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];

function EventLog({ deviceId }: { deviceId: string }) {
  const { data, isPending, isError } = useEvents(deviceId);

  if (isPending) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState message="Couldn't load the event log." />;

  if (!data.cloudConfigured) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="Cloud sync not configured"
        description="Connect Supabase on the backend to start recording fan and mode change events."
      />
    );
  }

  if (data.events.length === 0) {
    return <EmptyState icon={LineChartIcon} title="No events yet" description="Fan and mode changes will appear here." />;
  }

  return (
    <ul className="divide-y divide-ink-100 dark:divide-ink-800">
      {data.events.map((e) => (
        <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 py-3">
          <div
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              e.kind === "fan" ? "bg-eco-100 text-eco-600 dark:bg-eco-950 dark:text-eco-400" : "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
            )}
          >
            {e.kind === "fan" ? <Fan className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-ink-900 dark:text-ink-50">
              {e.kind === "fan" ? `Fan turned ${e.action}` : `Mode changed to ${e.mode}`}
              {e.kind === "fan" && <span className="ml-1.5 font-normal text-ink-400">({e.trigger})</span>}
            </p>
            <p className="text-ink-400">{new Date(e.occurred_at).toLocaleString()}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeviceHistory({ deviceId }: { deviceId: string }) {
  const [range, setRange] = useState<HistoryRange>("day");
  const { data, isPending, isError, error, refetch } = useHistory(deviceId, range);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Fill-level history</h2>
          <div className="flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={clsx(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  range === r.value
                    ? "bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-ink-50"
                    : "text-ink-500 dark:text-ink-400"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {isPending ? (
            <Skeleton className="h-72" />
          ) : isError ? (
            <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
          ) : !data.cloudConfigured ? (
            <EmptyState
              icon={LineChartIcon}
              title="Cloud sync not configured"
              description="Connect Supabase on the backend to start recording fill-level history."
            />
          ) : data.readings.length === 0 ? (
            <EmptyState icon={LineChartIcon} title="No data in this range yet" description="Check back once the bin has reported a few readings." />
          ) : (
            <HistoryChart readings={data.readings} range={range} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">Event log</h2>
        </CardHeader>
        <CardBody>
          <EventLog deviceId={deviceId} />
        </CardBody>
      </Card>
    </div>
  );
}

export function History() {
  const { deviceId, isLoading } = useCurrentDevice();

  if (isLoading) return <Skeleton className="h-96" />;
  if (!deviceId) return <EmptyState icon={LineChartIcon} title="No bin selected" />;

  return <DeviceHistory deviceId={deviceId} />;
}
