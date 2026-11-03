import { Activity } from "../models/Activity.js";
import { COLUMN_LABELS } from "../shared/constants.js";

/**
 * logActivity — records a human-readable audit entry for a task mutation.
 *
 * Called AFTER the DB write succeeds so the activity row is only created
 * when the actual operation worked. Wrapped in try/catch so a Mongo hiccup
 * or schema validation error here NEVER bubbles up to crash the main request.
 *
 * @param {object} opts
 * @param {"created"|"updated"|"deleted"|"moved"|"reordered"} opts.action
 * @param {object}  opts.task        – the Mongoose doc / plain object for the task
 * @param {string}  [opts.fromColumn] – source columnId (for moved/reordered)
 * @param {string}  [opts.toColumn]   – destination columnId (for moved)
 * @param {string}  [opts.actor]      – defaults to "User"
 */
export async function logActivity({ action, task, fromColumn, toColumn, actor = "User" }) {
  try {
    const title = task.title ?? "Untitled";
    let message;

    switch (action) {
      case "created":
        message = `Task '${title}' created by ${actor}`;
        break;

      case "updated":
        message = `Task '${title}' updated by ${actor}`;
        break;

      case "deleted":
        message = `Task '${title}' deleted by ${actor}`;
        break;

      case "moved": {
        // COLUMN_LABELS maps "in-progress" → "In Progress" etc.
        const fromLabel = COLUMN_LABELS[fromColumn] ?? fromColumn;
        const toLabel   = COLUMN_LABELS[toColumn]   ?? toColumn;
        message = `Task '${title}' moved from '${fromLabel}' to '${toLabel}' by ${actor}`;
        break;
      }

      case "reordered": {
        const colLabel = COLUMN_LABELS[toColumn ?? task.columnId] ?? (toColumn ?? task.columnId);
        message = `Task '${title}' reordered in '${colLabel}' by ${actor}`;
        break;
      }

      default:
        message = `Task '${title}' — ${action} by ${actor}`;
    }

    await Activity.create({
      action,
      taskId:     task._id,
      taskTitle:  title,
      fromColumn: fromColumn ?? null,
      toColumn:   toColumn   ?? task.columnId,
      message,
      actor,
    });
  } catch (err) {
    // A logging failure must never affect the HTTP response.
    console.error("[activityService] Failed to log activity:", err.message);
  }
}
