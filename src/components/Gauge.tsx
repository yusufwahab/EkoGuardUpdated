import { motion } from "framer-motion";

interface GaugeProps {
  /** 0-100, or -1/undefined for "unknown". */
  value: number;
  size?: number;
  strokeWidth?: number;
}

function fillColor(value: number): string {
  if (value < 0) return "var(--color-ink-300)";
  if (value < 50) return "var(--color-fill-low)";
  if (value < 75) return "var(--color-fill-medium)";
  if (value < 90) return "var(--color-fill-high)";
  return "var(--color-fill-full)";
}

function fillLabel(value: number): string {
  if (value < 0) return "Unknown";
  if (value < 50) return "Low";
  if (value < 75) return "Medium";
  if (value < 90) return "High";
  return "Full";
}

/** Animated circular "tank" gauge for bin fill level - the dashboard's centerpiece visual. */
export function Gauge({ value, size = 200, strokeWidth = 16 }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const known = value >= 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = fillColor(value);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={known ? clamped : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Bin fill level"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-ink-100 dark:stroke-ink-800"
        />
        {known && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-bold tabular-nums text-ink-900 dark:text-ink-50">
          {known ? `${Math.round(clamped)}%` : "—"}
        </span>
        <span className="text-sm font-medium" style={{ color }}>
          {fillLabel(value)}
        </span>
      </div>
    </div>
  );
}
