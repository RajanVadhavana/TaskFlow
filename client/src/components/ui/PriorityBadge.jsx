import { PRIORITY_COLORS } from "../../utils/constants.js";

/**
 * Pill badge displaying Low / Medium / High priority.
 * Colors chosen to meet WCAG AA contrast against their backgrounds.
 */
export default function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${color}`}
    >
      {priority}
    </span>
  );
}