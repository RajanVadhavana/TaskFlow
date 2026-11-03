import React from "react";

/**
 * Skeleton
 *
 * Animated placeholder shown while content is loading.
 * Uses a pulse animation so the user knows something is coming.
 *
 * Props:
 *   className : Tailwind classes that set width/height/shape.
 *               e.g. <Skeleton className="h-4 w-32 rounded" />
 */
export default function Skeleton({ className = "" }) {
  return (
    <div
      // aria-hidden so screen readers don't announce placeholder rectangles.
      aria-hidden="true"
      className={[
        "animate-pulse",
        "bg-[color:var(--color-surface-hover)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
