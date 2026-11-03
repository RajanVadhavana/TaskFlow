import { PRIORITY_COLORS } from "../../utils/constants.js";

/**
 * Tiny coloured pill that shows a task's priority level.
 * Colours are defined in constants.js for WCAG AA compliance.
 */
export default function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${PRIORITY_COLORS[priority]}`}
    >
      {priority}
    </span>
  );
}
