import React from "react";
import { Sun, Moon, Kanban, Bell, Plus } from "lucide-react";
import { useTheme } from "../hooks/useTheme.js";
import IconButton from "./ui/IconButton.jsx";
import Button from "./ui/Button.jsx";
import DevToolsPopover from "./ui/DevToolsPopover.jsx";

/**
 * Navbar
 *
 * Sticky top bar with:
 *  - Logo mark + "TaskFlow" wordmark
 *  - DevTools chaos panel (Sliders icon)
 *  - Bell button → Activity drawer; shows indigo unread dot when hasUnread=true
 *  - Theme toggle
 *  - "New Task" primary button
 *
 * Props:
 *   onNewTask      : () => void
 *   newTaskBtnRef  : React.Ref  – forwarded to the New Task button so the
 *                                 modal can return focus to it on close (WCAG 2.4.3)
 *   onActivity     : () => void
 *   hasUnread      : boolean
 */
export default function Navbar({ onNewTask, newTaskBtnRef, onActivity, hasUnread = false }) {
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
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[color:var(--color-accent)] shrink-0"
            aria-hidden="true"
          >
            <Kanban size={15} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-sm text-[color:var(--color-text)] tracking-tight">
              TaskFlow
            </span>
            <span className="hidden sm:block text-xs text-[color:var(--color-text-muted)]">
              Kanban board
            </span>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">

          <DevToolsPopover />

          {/* Activity Bell — unread dot indicates new activity while drawer was closed */}
          <div className="relative">
            <IconButton aria-label="View activity log" onClick={onActivity}>
              <Bell size={17} />
            </IconButton>
            {/* Dot: visually hidden from AT via aria-hidden; the button label covers it */}
            {hasUnread && (
              <span
                aria-hidden="true"
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

          {/* New Task — ref forwarded so modal can return focus here on close */}
          <Button
            ref={newTaskBtnRef}
            variant="primary"
            size="sm"
            onClick={onNewTask}
          >
            <Plus size={15} aria-hidden="true" />
            New Task
          </Button>
        </div>
      </div>
    </header>
  );
}
