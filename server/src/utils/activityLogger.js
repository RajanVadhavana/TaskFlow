import { Activity } from "../models/Activity.js";

export function logActivity({ action, task, fromColumn, toColumn, actor = "User" }) {
  const messages = {
    created: `Created "${task.title}"`,
    updated: `Updated "${task.title}"`,
    deleted: `Deleted "${task.title}"`,
    moved: `Moved "${task.title}" from ${fromColumn} to ${toColumn}`,
    reordered: `Reordered "${task.title}" in ${task.columnId}`,
  };

  Activity.create({
    action,
    taskId: task._id,
    taskTitle: task.title,
    fromColumn,
    toColumn,
    actor,
    message: messages[action] || `Modified "${task.title}"`,
  }).catch((err) => {
    console.error("Activity logging failed (non-fatal):", err.message);
  });
}