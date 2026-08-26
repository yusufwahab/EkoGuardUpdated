import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/** Calm, actionable error UI - never a raw stack trace. */
export function ErrorState({ message = "Something went wrong loading this data.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-950/50">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="font-display font-semibold text-ink-900 dark:text-ink-50">Couldn't load this</p>
      <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
