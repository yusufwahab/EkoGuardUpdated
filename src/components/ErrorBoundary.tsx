import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Top-level safety net: a render crash anywhere shows this instead of a blank white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center dark:bg-ink-950">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-danger dark:bg-red-950/50">
            <AlertOctagon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-ink-50">Something went wrong</h1>
          <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
