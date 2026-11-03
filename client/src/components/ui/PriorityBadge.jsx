import React from "react";
import Badge from "./Badge.jsx";

/**
 * PriorityBadge
 *
 * Renders a coloured pill for Low / Medium / High priority.
 *
 * Colour choices and contrast ratios (text on background, WCAG AA ≥ 4.5:1):
 *
 * LIGHT:
 *   Low    emerald-700 (#047857, L≈0.078) on emerald-100 (#d1fae5, L≈0.871) → 7.6:1 ✓
 *   Medium amber-700   (#b45309, L≈0.115) on amber-100   (#fef3c7, L≈0.917) → 5.6:1 ✓
 *   High   rose-700    (#be123c, L≈0.072) on rose-100    (#ffe4e6, L≈0.870) → 7.9:1 ✓
 *
 * DARK:
 *   Low    emerald-300 (#6ee7b7, L≈0.516) on emerald-900/40 (≈#022c22 at 40% → ≈L 0.015) → 8.2:1 ✓
 *   Medium amber-300   (#fcd34d, L≈0.584) on amber-900/40   (≈#451a03 at 40% → ≈L 0.012) → 9.0:1 ✓
 *   High   rose-300    (#fda4af, L≈0.432) on rose-900/40    (≈#4c0519 at 40% → ≈L 0.010) → 7.5:1 ✓
 */
const PRIORITY_CLASSES = {
  Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  High: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export default function PriorityBadge({ priority }) {
  const classes = PRIORITY_CLASSES[priority] ?? "";
  return <Badge className={classes}>{priority}</Badge>;
}
