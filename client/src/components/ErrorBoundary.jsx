import React from "react";

/**
 * ErrorBoundary
 *
 * Wraps the whole app. Any unhandled render error shows a plain recovery screen
 * instead of a blank white page.  React class component is the only way to
 * catch render-phase errors (hooks cannot do this yet).
 *
 * Props:
 *   children : ReactNode
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err) {
    // Called during the render that threw — update state so next render shows the fallback.
    return { hasError: true, message: err?.message || "Unknown error" };
  }

  componentDidCatch(err, info) {
    // Log to console in dev; in production you'd send to a monitoring service here.
    console.error("[ErrorBoundary] Uncaught error:", err, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center p-6
                   bg-[color:var(--color-bg)]"
      >
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30
                          flex items-center justify-center text-rose-600 dark:text-rose-400
                          text-2xl font-bold select-none">
            !
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold text-[color:var(--color-text)]">
              Something went wrong
            </h1>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
              An unexpected error occurred in the app.
            </p>
            {/* Show the raw message only in dev so users don't see noise */}
            {import.meta.env.DEV && (
              <pre className="mt-2 text-left text-xs bg-slate-100 dark:bg-slate-800
                              text-rose-700 dark:text-rose-300 p-3 rounded-lg
                              overflow-x-auto whitespace-pre-wrap break-words">
                {this.state.message}
              </pre>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg text-sm font-medium
                       bg-[color:var(--color-accent)] text-white
                       hover:opacity-90 transition-opacity
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[color:var(--color-accent)]
                       focus-visible:ring-offset-2"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
