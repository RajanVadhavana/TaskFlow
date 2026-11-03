import React, { useState } from "react";
import { useBoardStore } from "../store/useBoardStore.js";
import { COLUMNS, COLUMN_ORDER, COLUMN_LABELS, PRIORITIES } from "../utils/constants.js";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";

/**
 * TaskModal
 *
 * Unified modal for creating or editing a task.
 *  - When `task` prop is provided -> Edit mode
 *  - When `task` is omitted/null   -> Create mode (uses defaultColumnId or "todo")
 *  - Inline title validation error
 *  - Character counters (120 for title, 1000 for description)
 *  - Enter key to submit
 *
 * Props:
 *   task            : Task object (optional, for edit mode)
 *   defaultColumnId : string (optional, defaults to COLUMNS.TODO)
 *   onClose         : () => void
 *   onSuccess       : () => void (optional, invoked after successful create or edit)
 */
export default function TaskModal({
  task = null,
  defaultColumnId = COLUMNS.TODO,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(task);
  const createTask = useBoardStore((s) => s.createTask);
  const updateTask = useBoardStore((s) => s.updateTask);

  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "Medium",
    columnId: task?.columnId || defaultColumnId,
    tags: (task?.tags || []).join(", "),
  });

  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "title") setTitleError("");
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateTask(task._id, {
          title: trimmedTitle,
          description: form.description.trim(),
          priority: form.priority,
          tags,
        });
      } else {
        await createTask({
          title: trimmedTitle,
          description: form.description.trim(),
          priority: form.priority,
          columnId: form.columnId,
          tags,
        });
      }
      onSuccess?.();
      onClose();
    } catch {
      // Toast is already triggered by store action
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEditing ? "Edit Task" : "New Task"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="task-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Title <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs tabular-nums ${
                form.title.length >= 110 ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {form.title.length}/120
            </span>
          </div>
          <input
            id="task-title"
            name="title"
            className="input"
            placeholder="What needs to be done?"
            maxLength={120}
            value={form.title}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            autoFocus
          />
          {titleError && <p className="text-xs text-rose-500">{titleError}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="task-desc" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <span
              className={`text-xs tabular-nums ${
                form.description.length >= 950 ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {form.description.length}/1000
            </span>
          </div>
          <textarea
            id="task-desc"
            name="description"
            className="input resize-none"
            rows={3}
            placeholder="Add more context…"
            maxLength={1000}
            value={form.description}
            onChange={handleChange}
          />
        </div>

        {/* Priority + Column row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Priority
            </label>
            <select
              id="task-priority"
              name="priority"
              className="input"
              value={form.priority}
              onChange={handleChange}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="task-column" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Column
            </label>
            <select
              id="task-column"
              name="columnId"
              className="input"
              value={form.columnId}
              onChange={handleChange}
              disabled={isEditing} // column moves happen via drag & drop
            >
              {COLUMN_ORDER.map((id) => (
                <option key={id} value={id}>
                  {COLUMN_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label htmlFor="task-tags" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tags <span className="text-slate-400 font-normal">(comma-separated)</span>
          </label>
          <input
            id="task-tags"
            name="tags"
            className="input"
            placeholder="e.g. frontend, bug, v2"
            value={form.tags}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save Changes" : "Create Task")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
