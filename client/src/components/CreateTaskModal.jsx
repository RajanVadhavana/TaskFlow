import { useState } from "react";
import { useTaskStore } from "../store/useTaskStore.js";
import { COLUMNS, COLUMN_ORDER, COLUMN_LABELS, PRIORITIES } from "../utils/constants.js";
import Modal from "./ui/Modal.jsx";

export default function CreateTaskModal({ onClose }) {
  const { createTask } = useTaskStore();

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    columnId: COLUMNS.TODO,
    tags: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "title") setTitleError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await createTask({ ...form, tags });
      onClose();
    } catch {
      // toast shown in store
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Task" onClose={onClose}>
      <form id="create-task-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="create-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="create-title"
            name="title"
            className="input"
            placeholder="What needs to be done?"
            maxLength={120}
            value={form.title}
            onChange={handleChange}
            autoFocus
          />
          {titleError && (
            <p className="text-xs text-rose-500">{titleError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="create-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            id="create-description"
            name="description"
            className="input resize-none"
            rows={3}
            placeholder="Add more context…"
            maxLength={1000}
            value={form.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="create-priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Priority
            </label>
            <select
              id="create-priority"
              name="priority"
              className="input"
              value={form.priority}
              onChange={handleChange}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="create-column" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Column
            </label>
            <select
              id="create-column"
              name="columnId"
              className="input"
              value={form.columnId}
              onChange={handleChange}
            >
              {COLUMN_ORDER.map((id) => (
                <option key={id} value={id}>{COLUMN_LABELS[id]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="create-tags" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tags <span className="text-slate-400 font-normal">(comma-separated)</span>
          </label>
          <input
            id="create-tags"
            name="tags"
            className="input"
            placeholder="e.g. frontend, bug, v2"
            value={form.tags}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button id="create-cancel-btn" type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            id="create-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}