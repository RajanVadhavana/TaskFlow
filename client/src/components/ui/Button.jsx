import React from "react";

/**
 * Button
 *
 * Props:
 *   variant : "primary" | "secondary" | "ghost" | "danger"  (default "primary")
 *   size    : "sm" | "md" | "lg"                            (default "md")
 *   All other props (onClick, disabled, type, etc.) are spread onto <button>.
 *
 * Rationale: one component instead of four CSS classes keeps the surface small
 * and makes the API easy to explain during a code review.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg " +
  "transition-colors duration-150 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS = {
  primary:
    "bg-[color:var(--color-accent)] text-[color:var(--color-accent-text)] " +
    "hover:opacity-90 active:opacity-80 " +
    "focus-visible:ring-[color:var(--color-accent)]",

  secondary:
    "bg-surface border border-[color:var(--color-border)] " +
    "text-[color:var(--color-text)] hover:bg-surface-hover active:opacity-80 " +
    "focus-visible:ring-[color:var(--color-accent)]",

  ghost:
    "text-[color:var(--color-text-muted)] hover:bg-surface-hover active:opacity-80 " +
    "focus-visible:ring-[color:var(--color-accent)]",

  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 " +
    "focus-visible:ring-rose-500",
};

const SIZES = {
  sm: "text-xs px-2.5 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const classes = [BASE, VARIANTS[variant], SIZES[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

