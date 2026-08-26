import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReadingPoint } from "../../types/device";

interface HistoryChartProps {
  readings: ReadingPoint[];
  range: "hour" | "day" | "week";
}

function formatTick(iso: string, range: HistoryChartProps["range"]) {
  const date = new Date(iso);
  if (range === "week") return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-md dark:border-ink-700 dark:bg-ink-900">
      <p className="text-ink-500 dark:text-ink-400">{new Date(label).toLocaleString()}</p>
      <p className="font-semibold text-eco-600 dark:text-eco-400">{payload[0].value}% full</p>
    </div>
  );
}

export function HistoryChart({ readings, range }: HistoryChartProps) {
  const data = readings.map((r) => ({ ...r, fill_level: r.fill_level ?? 0 }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-eco-500)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-eco-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-ink-200 dark:stroke-ink-800" vertical={false} />
        <XAxis
          dataKey="recorded_at"
          tickFormatter={(v: string) => formatTick(v, range)}
          tick={{ fontSize: 12, fill: "var(--color-ink-400)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--color-ink-400)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="fill_level"
          stroke="var(--color-eco-500)"
          strokeWidth={2}
          fill="url(#fillGradient)"
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
