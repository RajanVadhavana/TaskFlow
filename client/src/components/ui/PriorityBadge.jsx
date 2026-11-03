import { PRIORITY_COLORS } from "../../utils/constants.js";

export default function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {priority}
    </span>
  );
}