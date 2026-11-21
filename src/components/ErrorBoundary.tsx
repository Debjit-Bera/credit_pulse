import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      detail: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedMessage = error.message || 'An unexpected application error occurred.';
    let detail: string | null = null;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error && parsed.operationType) {
        parsedMessage = `Firestore ${parsed.operationType} error on ${parsed.path || 'document'}`;
        detail = parsed.error;
      }
    } catch {
      // Plain error message
    }

    return {
      hasError: true,
      message: parsedMessage,
      detail,
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                CreditPulse encountered an error
              </h1>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{this.state.message}</p>
            {this.state.detail && (
              <pre className="text-xs font-mono-tabular bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded-lg overflow-x-auto mb-5">
                {this.state.detail}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
