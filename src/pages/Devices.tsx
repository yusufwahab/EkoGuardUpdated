import { useNavigate } from "react-router-dom";
import { Boxes, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useCurrentDevice } from "../providers/CurrentDeviceProvider";
import { Card, CardBody } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { ConnectionBadge } from "../components/ConnectionBadge";
import { Gauge } from "../components/Gauge";

/**
 * Multi-bin scaffold: the API and data model already support any number of
 * devices (see backend/src/services/deviceRegistry.ts), so this list is
 * ready to grow beyond one card without further rework.
 */
export function Devices() {
  const { devices, deviceId, selectDevice, isLoading, isError, refetch } = useCurrentDevice();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) return <ErrorState message="Couldn't reach the backend." onRetry={refetch} />;

  if (devices.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No bins registered"
        description="Add a row to the devices table (or set DEVICE_BASE_URL) on the backend to register your first bin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">Bins</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <button
            key={d.deviceId}
            onClick={() => {
              selectDevice(d.deviceId);
              navigate("/app");
            }}
            className="text-left"
          >
            <Card
              className={clsx(
                "h-full transition-shadow hover:shadow-md",
                d.deviceId === deviceId && "ring-2 ring-eco-500"
              )}
            >
              <CardBody className="flex items-center gap-4">
                <Gauge value={d.fillLevel} size={72} strokeWidth={8} />
                <div className="flex-1 space-y-1">
                  <p className="font-display font-semibold text-ink-900 dark:text-ink-50">{d.name}</p>
                  {d.location && <p className="text-xs text-ink-400">{d.location}</p>}
                  <ConnectionBadge connection={d.connection} stale={d.stale} />
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
              </CardBody>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
