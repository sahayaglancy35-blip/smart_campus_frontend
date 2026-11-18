import React from "react";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="mx-auto max-w-xl my-8 rounded-3xl border border-red-200 bg-red-50/60 p-6 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-red-900">
            {this.props.title || "Something went wrong"}
          </h3>
          <p className="mt-1 text-xs text-red-700 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred while rendering this view."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition shadow-xs"
            >
              <ArrowPathIcon className="h-4 w-4" /> Try Again
            </button>
            {this.props.onReturn && (
              <button
                type="button"
                onClick={this.props.onReturn}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Return to Hub
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
