
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface RootErrorBoundaryProps {
  children?: ReactNode;
}

interface RootErrorBoundaryState {
  errorMessage: string | null;
}

class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  declare props: RootErrorBoundaryProps;
  declare setState: Component<RootErrorBoundaryProps, RootErrorBoundaryState>['setState'];
  state: RootErrorBoundaryState = {
    errorMessage: null,
  };

  private handleWindowError = (event: ErrorEvent) => {
    this.setState({
      errorMessage: event.error?.message || event.message || 'Unexpected application error.',
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection.';

    this.setState({ errorMessage: message });
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      errorMessage: error.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Root render error', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  render() {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#581c1c]">Application Error</h1>
          <p className="mt-3 text-sm text-slate-600">
            The page crashed while rendering. Reload the page. If this message repeats, send the text below.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">
            {this.state.errorMessage}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
