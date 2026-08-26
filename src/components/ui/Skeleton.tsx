import clsx from "clsx";

/** Shimmering placeholder - used instead of a blank screen while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "skeleton-shimmer rounded-md bg-linear-to-r from-ink-100 via-ink-200 to-ink-100 dark:from-ink-800 dark:via-ink-700 dark:to-ink-800",
        className
      )}
    />
  );
}
