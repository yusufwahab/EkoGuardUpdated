import { useQuery } from "@tanstack/react-query";

export interface WeatherSnapshot {
  temperatureC: number;
  humidity: number;
  weatherCode: number;
}

// Central Lagos - a reasonable default for a waste-management deployment;
// swapped for the device's real registered location once that's wired up.
const DEFAULT_LAT = 6.5244;
const DEFAULT_LON = 3.3792;

async function getPosition(): Promise<{ lat: number; lon: number }> {
  if (!("geolocation" in navigator)) return { lat: DEFAULT_LAT, lon: DEFAULT_LON };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON }), 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(timeout);
        resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      },
      { timeout: 2500 }
    );
  });
}

/**
 * Ambient conditions from Open-Meteo (free, no API key) - contextualizes
 * why ventilation/fan behavior matters. Never blocks or errors the
 * dashboard: a failed fetch just means the widget doesn't render.
 */
export function useWeather() {
  return useQuery({
    queryKey: ["weather"],
    queryFn: async (): Promise<WeatherSnapshot> => {
      const { lat, lon } = await getPosition();
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`
      );
      if (!res.ok) throw new Error("Open-Meteo request failed");
      const data = await res.json();
      return {
        temperatureC: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        weatherCode: data.current.weather_code,
      };
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
