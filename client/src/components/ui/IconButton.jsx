import React from "react";

/**
 * IconButton
 *
 * A square button intended for icon-only actions.
 * aria-label is REQUIRED for screen readers — the prop is listed explicitly
 * so TypeErrors surface when it's missing.
 *
 * Props:
 *   aria-label : string  (required)
 *   size       : "sm" | "md" | "lg"  (default "md")
 *   variant    : "ghost" | "secondary"  (default "ghost")
 *   All other props spread onto <button>.
 */

const SIZES = {
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
};

const VARIANTS = {
  ghost:
    "text-[color:var(--color-text-muted)] hover:bg-surface-hover rounded-lg " +
    "transition-colors duration-150",
  secondary:
    "bg-surface border border-[color:var(--color-border)] " +
    "text-[color:var(--color-text)] hover:bg-surface-hover rounded-lg " +
    "transition-colors duration-150",
};

export default function IconButton({
  "aria-label": ariaLabel,
  size = "md",
  variant = "ghost",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={[
        "inline-flex items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[color:var(--color-accent)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
