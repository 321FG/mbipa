import React from "react";
import { NetworkErrorScreen } from "./NetworkErrorScreen";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  statusCode?: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught:", error, errorInfo);

    // Determine status code from error
    let statusCode = 500;
    if (
      error.message.includes("Network") ||
      error.message.includes("Failed to fetch")
    ) {
      statusCode = 0; // No internet
    } else if (error.message.includes("404")) {
      statusCode = 404;
    }

    this.setState({
      errorInfo,
      statusCode,
    });

    // Log to external service if needed
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      statusCode: undefined,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <NetworkErrorScreen
          error={this.state.error.message}
          statusCode={this.state.statusCode}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
