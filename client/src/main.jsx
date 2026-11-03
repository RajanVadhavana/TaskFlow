import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {/* Toaster lives here so it renders above everything */}
    <Toaster
      position="bottom-right"
      toastOptions={{
        className:
          "!bg-white !text-slate-900 !border !border-slate-200 !shadow-card dark:!bg-slate-900 dark:!text-slate-100 dark:!border-slate-700",
        duration: 3000,
      }}
    />
  </React.StrictMode>
);