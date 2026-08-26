import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-ink-200/70 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx("flex items-center justify-between gap-3 p-5 pb-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={clsx("p-5", className)} {...props}>
      {children}
    </div>
  );
}
