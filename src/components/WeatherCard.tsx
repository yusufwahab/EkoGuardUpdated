import { CloudSun, Droplets, Thermometer } from "lucide-react";
import { Card, CardBody } from "./ui/Card";
import { useWeather } from "../hooks/useWeather";

export function WeatherCard() {
  const { data, isError, isPending } = useWeather();

  if (isError || isPending) return null; // ambient context is a bonus, never worth an error/loading state of its own

  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
          <CloudSun className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Ambient conditions</p>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-ink-700 dark:text-ink-300">
            <span className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5" /> {Math.round(data.temperatureC)}°C
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" /> {data.humidity}% humidity
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
