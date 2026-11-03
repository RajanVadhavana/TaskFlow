import React from "react";
import { Sun, Moon, Kanban, Bell, Plus } from "lucide-react";
import { useTheme } from "../hooks/useTheme.js";
import IconButton from "./ui/IconButton.jsx";
import Button from "./ui/Button.jsx";
import DevToolsPopover from "./ui/DevToolsPopover.jsx";

/**
 * Header / Navbar
 *
 * Sticky top bar with:
 *  - Logo mark + "TaskFlow" wordmark + subtitle
 *  - DevTools popover (Sliders icon) — chaos simulation toggles
 *  - Bell button that opens the Activity drawer.
 *    Shows a small indigo dot when hasUnread=true (new activity while closed).
 *  - Theme toggle (sun/moon) powered by useTheme
 *  - "New Task" primary action button
 *
 * Props:
 *   onNewTask  : () => void  – opens the create modal
 *   onActivity : () => void  – opens the activity drawer
 *   hasUnread  : boolean     – shows unread dot on Bell when true
 */
export default function Navbar({ onNewTask, onActivity, hasUnread = false }) {
  const { isDark, toggle } = useTheme();

  return (
    <header
      className="
        sticky top-0 z-40
        border-b border-[color:var(--color-border)]
        bg-[color:var(--color-surface)]/80 backdrop-blur-md
      "
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ── Brand ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo mark: indigo kanban icon */}
          <div
            className="
              w-7 h-7 rounded-lg flex items-center justify-center
              bg-[color:var(--color-accent)]
            "
            aria-hidden
          >
            <Kanban size={15} className="text-white" />
          </div>

          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-sm text-[color:var(--color-text)] tracking-tight">
              TaskFlow
            </span>
            {/* Subtitle hidden below 480px so the header fits on small screens */}
            <span className="hidden sm:block text-xs text-[color:var(--color-text-muted)]">
              Kanban board
            </span>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">

          {/* Dev tools — simulation / chaos panel */}
          <DevToolsPopover />

          {/* Activity Bell — dot indicates new activity while drawer was closed */}
          <div className="relative">
            <IconButton
              aria-label="View activity log"
              onClick={onActivity}
            >
              <Bell size={17} />
            </IconButton>

            {/* Unread dot: small indigo circle, hidden when hasUnread is false.
                Uses aria-hidden because the label on the button is sufficient. */}
            {hasUnread && (
              <span
                aria-hidden
                className="
                  absolute top-0.5 right-0.5
                  w-2 h-2 rounded-full
                  bg-[color:var(--color-accent)]
                  ring-2 ring-[color:var(--color-surface)]
                "
              />
            )}
          </div>

          {/* Theme toggle */}
          <IconButton
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggle}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>

          {/* New task */}
          <Button variant="primary" size="sm" onClick={onNewTask}>
            <Plus size={15} aria-hidden />
            New Task
          </Button>
        </div>
      </div>
    </header>
  );
}
