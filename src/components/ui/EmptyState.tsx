import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="font-display font-semibold text-ink-900 dark:text-ink-50">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      {action}
    </div>
  );
}
