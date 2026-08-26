import { motion } from "framer-motion";
import { Fan } from "lucide-react";
import clsx from "clsx";

export function FanIndicator({ on, size = 28 }: { on: boolean; size?: number }) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full p-2 transition-colors",
        on ? "bg-eco-100 text-eco-600 dark:bg-eco-950 dark:text-eco-400" : "bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500"
      )}
      role="img"
      aria-label={on ? "Fan is running" : "Fan is off"}
    >
      <motion.div
        animate={on ? { rotate: 360 } : { rotate: 0 }}
        transition={on ? { duration: 1.2, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
      >
        <Fan style={{ width: size, height: size }} aria-hidden="true" />
      </motion.div>
    </div>
  );
}
