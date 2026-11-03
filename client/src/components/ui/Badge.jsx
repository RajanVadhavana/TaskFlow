import React from "react";

/**
 * Badge
 *
 * A small pill for labels, tags, counts, etc.
 * Accepts an arbitrary `className` for colour overrides (e.g. PriorityBadge).
 *
 * Props:
 *   className : extra Tailwind classes (usually colour)
 *   children  : text content
 */
export default function Badge({ className = "", children }) {
  return (
    <span
      className={[
        "inline-block px-2 py-0.5 rounded-md text-xs font-medium",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

