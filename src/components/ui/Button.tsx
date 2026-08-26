import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-eco-600 text-white hover:bg-eco-700 focus-visible:outline-eco-600 disabled:bg-eco-600/50",
  secondary:
    "bg-ink-100 text-ink-900 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-50 dark:hover:bg-ink-700",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
  danger: "bg-danger text-white hover:bg-red-700",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-60",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
