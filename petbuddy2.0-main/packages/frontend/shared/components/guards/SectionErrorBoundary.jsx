"use client";
import React from "react";
import { Button } from "@/shared/components/ui";
import { config } from "@/config/env";

/**
 * Section Error Boundary - Lightweight error boundary for page sections
 * Shows inline error UI instead of full-page fallback
 *
 * @example
 * <SectionErrorBoundary sectionName="User Profile">
 *   <UserProfile />
 * </SectionErrorBoundary>
 */
class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error });

    if (config.isDevelopment) {
      console.error(`SectionErrorBoundary (${this.props.sectionName}):`, error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 my-4">
          <div className="flex items-start gap-3">
            {/* Error Icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Error Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Error loading {this.props.sectionName || "this section"}
              </h3>
              <p className="text-sm text-red-700 mb-3">
                {this.props.errorMessage ||
                  "Something went wrong while loading this content. Please try again."}
              </p>

              {/* Development Error Details */}
              {config.isDevelopment && this.state.error && (
                <details className="mb-3">
                  <summary className="text-xs text-red-600 cursor-pointer font-medium">
                    Error Details (Dev)
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border border-red-300 overflow-x-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              {/* Retry Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
