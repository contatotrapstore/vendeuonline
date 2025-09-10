import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.generateErrorId(),
    });

    // Log error to console in development
    if (import.meta.env.MODE === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Here you could send error to analytics service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Log to analytics service (could be Sentry, LogRocket, etc.)
      const errorData = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // In a real app, send to your error tracking service
      console.error("Error logged:", errorData);

      // Store in localStorage for debugging
      const errorLogs = JSON.parse(localStorage.getItem("error-logs") || "[]");
      errorLogs.push(errorData);
      if (errorLogs.length > 10) errorLogs.shift(); // Keep only last 10 errors
      localStorage.setItem("error-logs", JSON.stringify(errorLogs));
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Oops! Algo deu errado</h1>

            <p className="text-gray-600 mb-6">
              Encontramos um erro inesperado. Nossa equipe foi notificada e está trabalhando na correção.
            </p>

            <div className="text-xs text-gray-400 mb-6 font-mono">Error ID: {this.state.errorId}</div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </button>

              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para Início
              </Link>
            </div>

            {this.props.showDetails && this.state.error && import.meta.env.MODE === "development" && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Detalhes Técnicos
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                  <div className="text-red-600 mb-2">{this.state.error.toString()}</div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="text-gray-600">{this.state.errorInfo.componentStack}</div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to report errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: string) => {
    console.error("Manual error report:", error);

    // You could trigger error boundary or report to service here
    const errorData = {
      message: error.message,
      stack: error.stack,
      info: errorInfo,
      timestamp: new Date().toISOString(),
    };

    // Store error for debugging
    const errorLogs = JSON.parse(localStorage.getItem("manual-errors") || "[]");
    errorLogs.push(errorData);
    if (errorLogs.length > 5) errorLogs.shift();
    localStorage.setItem("manual-errors", JSON.stringify(errorLogs));
  }, []);

  return { handleError };
};

export default ErrorBoundary;
