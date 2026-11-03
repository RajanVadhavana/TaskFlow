import React, { useState, useRef, useEffect } from "react";
import { Sliders, X } from "lucide-react";
import { simulation } from "../../api/client.js";

/**
 * DevToolsPopover
 *
 * A small popover in the Navbar header that lets developers toggle:
 *   - Simulate failure: every PATCH /move returns 500
 *   - Latency: add artificial network delay (0 / 500 / 1500 / 3000 ms)
 *
 * Mutates the exported `simulation` object in api/client.js directly —
 * no React state needed because the object is read at request time, not
 * at render time.
 *
 * Shows an amber badge in the trigger button while any simulation is active.
 */
export default function DevToolsPopover() {
  const [open, setOpen] = useState(false);
  // Local state mirrors simulation object so the UI reflects current values.
  const [failure, setFailure]   = useState(simulation.failure);
  const [latency, setLatency]   = useState(simulation.latencyMs);
  const popoverRef              = useRef(null);

  const isActive = failure || latency > 0;

  // Keep simulation object in sync whenever local state changes.
  function toggleFailure() {
    const next = !failure;
    simulation.failure = next;
    setFailure(next);
  }

  function changeLatency(e) {
    const ms = Number(e.target.value);
    simulation.latencyMs = ms;
    setLatency(ms);
  }

  // Close on click-outside.
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Dev tools: simulation settings"
        aria-expanded={open}
        className="
          relative p-1.5 rounded-lg
          text-[color:var(--color-text-muted)]
          hover:bg-[color:var(--color-surface-hover)]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[color:var(--color-accent)]
          transition-colors duration-150
        "
      >
        <Sliders size={16} aria-hidden />
        {/* Amber badge — visible while any simulation is active */}
        {isActive && (
          <span
            aria-label="Simulation active"
            className="
              absolute -top-0.5 -right-0.5
              w-2 h-2 rounded-full
              bg-amber-400 ring-2
              ring-[color:var(--color-surface)]
            "
          />
        )}
      </button>

      {/* Popover panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Dev tools"
          className="
            absolute right-0 top-10 z-50 w-64
            bg-[color:var(--color-surface)]
            border border-[color:var(--color-border)]
            rounded-xl shadow-xl p-4 flex flex-col gap-4
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Dev Tools
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close dev tools"
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
            >
              <X size={14} aria-hidden />
            </button>
          </div>

          {/* Active badge */}
          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Simulation active — responses are degraded
              </span>
            </div>
          )}

          {/* Simulate failure toggle */}
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-[color:var(--color-text)]">
              Simulate failure (500)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={failure}
              onClick={toggleFailure}
              className={`
                relative inline-flex h-5 w-9 shrink-0 rounded-full
                transition-colors duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${failure ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow
                  transform transition-transform duration-200 mt-0.5
                  ${failure ? "translate-x-4" : "translate-x-0.5"}
                `}
              />
            </button>
          </label>

          {/* Latency selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="devtools-latency"
              className="text-sm text-[color:var(--color-text)]"
            >
              Latency
            </label>
            <select
              id="devtools-latency"
              value={latency}
              onChange={changeLatency}
              className="input text-sm py-1.5"
            >
              <option value={0}>Off</option>
              <option value={500}>500 ms</option>
              <option value={1500}>1 500 ms</option>
              <option value={3000}>3 000 ms</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Failure and latency are injected at the HTTP layer via{" "}
            <code className="font-mono text-[10px]">X-Simulate-*</code> headers.
            Reload the page to reset.
          </p>
        </div>
      )}
    </div>
  );
}
