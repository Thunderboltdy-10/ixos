import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center h-full w-full p-4 bg-transparent text-slate-400/50 text-xs font-mono">
                    {/* Minimal fallback to avoid layout shift */}
                    <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-4 h-4 opacity-50" />
                        <span>Visualization unavailable</span>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
