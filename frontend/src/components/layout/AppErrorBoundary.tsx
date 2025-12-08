import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md mx-auto p-6 bg-white border border-slate-200 rounded shadow">
            <h1 className="text-xl font-semibold mb-2 text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600 mb-4">
              The application encountered an unexpected error. Please refresh the page to try again.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              If this problem persists, please contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

