import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallbackClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Result Cards
 *
 * Catches rendering errors in result card components and displays
 * a graceful fallback instead of crashing the entire UI.
 */
export class ResultCardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ResultCard render error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            "px-4 py-3 flex items-center gap-3 bg-graphite-2/60 border border-stroke-hairline/70 rounded-md",
            this.props.fallbackClassName,
          )}
        >
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-fg-muted">
              Unable to display this result
            </p>
            <p className="text-xs text-fg-dim truncate">
              {this.state.error?.message || "An error occurred while rendering"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
