import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowUpDown,
  Inbox,
  RefreshCw,
  Loader2,
} from "lucide-react";

/**
 * ActivityDrawer
 *
 * Slide-over panel from the right showing the audit / activity feed.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal="true"
 *  - Focus trap: Tab cycles only inside the panel
 *  - Esc closes the drawer (same as overlay click)
 *  - Scroll lock while open
 *
 * Props:
 *   open          : boolean
 *   onClose       : () => void
 *   activities    : Activity[]
 *   nextCursor    : string | null
 *   loading       : boolean
 *   error         : string | null
 *   onLoadMore    : () => void
 *   onRetry       : () => void
 */
export default function ActivityDrawer({
  open,
  onClose,
  activities,
  nextCursor,
  loading,
  error,
  onLoadMore,
  onRetry,
}) {
  const panelRef = useRef(null);

  // ── Scroll lock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Keyboard: Esc + focus trap ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") { onClose(); return; }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled);

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ── Auto-focus the close button when drawer opens ────────────────────────────
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const first = panelRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (first) first.focus();
  }, [open]);

  // Group activities by day label: "Today", "Yesterday", or "DD Mon YYYY".
  const grouped = groupByDay(activities);

  const drawer = (
    <>
      {/* Backdrop overlay */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Activity log"
        className={[
          // Layout: full width on mobile, fixed 420px on sm+
          "fixed inset-y-0 right-0 z-50",
          "w-full sm:w-[420px]",
          "flex flex-col",
          "bg-[color:var(--color-surface)]",
          "border-l border-[color:var(--color-border)]",
          "shadow-2xl",
          // Slide animation
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-[color:var(--color-border)] shrink-0">
          <h2 className="text-base font-semibold text-[color:var(--color-text)]">
            Activity
          </h2>
          <button
            onClick={onClose}
            aria-label="Close activity drawer"
            className="
              p-1.5 rounded-lg
              text-[color:var(--color-text-muted)]
              hover:bg-[color:var(--color-surface-hover)]
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[color:var(--color-accent)]
            "
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Skeleton: shown only while loading AND list is empty (first fetch) */}
          {loading && activities.length === 0 && (
            <div className="flex flex-col gap-0 divide-y divide-[color:var(--color-border)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
              <button
                onClick={onRetry}
                className="
                  inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                  border border-[color:var(--color-border)]
                  text-[color:var(--color-text)]
                  hover:bg-[color:var(--color-surface-hover)]
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[color:var(--color-accent)]
                "
              >
                <RefreshCw size={12} aria-hidden /> Retry
              </button>
            </div>
          )}

          {/* Empty state: not loading, no error, nothing to show */}
          {!loading && !error && activities.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Inbox size={36} className="text-[color:var(--color-text-muted)] opacity-40" aria-hidden />
              <p className="text-sm text-[color:var(--color-text-muted)]">No activity yet</p>
            </div>
          )}

          {/* Activity list grouped by day */}
          {activities.length > 0 && (
            <div>
              {grouped.map(({ label, items }) => (
                <section key={label}>
                  {/* Day header */}
                  <div className="px-5 py-2 bg-[color:var(--color-bg)] sticky top-0 z-10">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      {label}
                    </span>
                  </div>

                  <div className="divide-y divide-[color:var(--color-border)]">
                    {items.map((activity) => (
                      <ActivityItem key={activity._id} activity={activity} />
                    ))}
                  </div>
                </section>
              ))}

              {/* Load more */}
              {nextCursor && (
                <div className="px-5 py-4 flex justify-center">
                  <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="
                      inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg
                      border border-[color:var(--color-border)]
                      text-[color:var(--color-text-muted)]
                      hover:bg-[color:var(--color-surface-hover)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-[color:var(--color-accent)]
                    "
                  >
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Loading…</>
                      : "Load more"
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}

// ── ActivityItem ──────────────────────────────────────────────────────────────

const ACTION_ICONS = {
  created:   Plus,
  updated:   Pencil,
  deleted:   Trash2,
  moved:     ArrowRight,
  reordered: ArrowUpDown,
};

const ACTION_COLORS = {
  created:   "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  updated:   "text-indigo-600  dark:text-indigo-400  bg-indigo-50  dark:bg-indigo-950/40",
  deleted:   "text-rose-600    dark:text-rose-400    bg-rose-50    dark:bg-rose-950/40",
  moved:     "text-amber-600   dark:text-amber-400   bg-amber-50   dark:bg-amber-950/40",
  reordered: "text-slate-600   dark:text-slate-400   bg-slate-100  dark:bg-slate-800/60",
};

function ActivityItem({ activity }) {
  const Icon = ACTION_ICONS[activity.action] ?? ArrowRight;
  const colorClass = ACTION_COLORS[activity.action] ?? ACTION_COLORS.reordered;

  // Format HH:mm for the visible time label.
  const date = new Date(activity.createdAt);
  const timeLabel = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  // Full ISO string in the tooltip so hover reveals the exact timestamp.
  const timeTitle = date.toISOString();

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-[color:var(--color-surface-hover)] transition-colors duration-100">
      {/* Action icon chip */}
      <span className={["mt-0.5 p-1.5 rounded-lg shrink-0", colorClass].join(" ")} aria-hidden>
        <Icon size={13} />
      </span>

      {/* Message + time */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[color:var(--color-text)] leading-snug break-words">
          {activity.message}
        </p>
        <time
          dateTime={timeTitle}
          title={timeTitle}
          className="text-xs text-[color:var(--color-text-muted)] mt-0.5 block"
        >
          {timeLabel}
        </time>
      </div>
    </div>
  );
}

// ── SkeletonItem ──────────────────────────────────────────────────────────────

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0 mt-0.5" />
      <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
        <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

// ── groupByDay ────────────────────────────────────────────────────────────────

/**
 * Groups an array of activity objects by calendar day.
 * Returns [{label: "Today"|"Yesterday"|"DD Mon YYYY", items: Activity[]}].
 *
 * We do this without date-fns to avoid adding a new dependency.
 * Comparison is done by matching year/month/day strings so timezone
 * differences in the user's locale are handled correctly.
 */
function groupByDay(activities) {
  const now  = new Date();
  const todayStr     = toDateStr(now);
  const yesterdayStr = toDateStr(new Date(now - 86_400_000));

  const map = new Map(); // preserves insertion order (newest first)

  for (const activity of activities) {
    const ds = toDateStr(new Date(activity.createdAt));
    let label;
    if (ds === todayStr)     label = "Today";
    else if (ds === yesterdayStr) label = "Yesterday";
    else label = new Date(activity.createdAt).toLocaleDateString([], {
      day: "numeric", month: "short", year: "numeric",
    });

    if (!map.has(label)) map.set(label, []);
    map.get(label).push(activity);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

/** Returns "YYYY-MM-DD" string in local time for date comparison. */
function toDateStr(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

