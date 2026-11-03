import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/*
      ErrorBoundary wraps everything so any unhandled render error shows
      a recovery screen instead of a blank white page.
    */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>

    {/*
      Toaster lives outside <App> so it's never unmounted when routes change.
      The className overrides map react-hot-toast's default white/black look
      to our design tokens.  We use !important (the ! prefix in Tailwind) to
      beat the library's inline styles.
    */}
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: [
          "!font-sans !text-sm !rounded-xl !shadow-card-hover",
          "!bg-[color:var(--color-surface)]",
          "!text-[color:var(--color-text)]",
          "!border !border-[color:var(--color-border)]",
        ].join(" "),
        duration: 3500,
        success: {
          iconTheme: { primary: "#4f46e5", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#e11d48", secondary: "#fff" },
        },
      }}
    />
  </React.StrictMode>
);
