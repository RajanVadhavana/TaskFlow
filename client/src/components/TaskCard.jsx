import { useState } from "react";
import { Trash2, GripVertical, Tag } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore.js";
import PriorityBadge from "./ui/PriorityBadge.jsx";

export default function TaskCard({ task }) {
  const { updateTask, deleteTask } = useTaskStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [deleting, setDeleting] = useState(false);

  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      await updateTask(task._id, { title: trimmed });
    } else {
      setTitle(task.title);
    }
    setEditing(false);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteTask(task._id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      id={`task-card-${task._id}`}
      className="card p-3 flex flex-col gap-2 select-none group transition-shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <GripVertical
          size={14}
          className="text-slate-300 dark:text-slate-600 shrink-0 cursor-default"
          aria-hidden="true"
        />
        <PriorityBadge priority={task.priority} />
        <button
          id={`delete-task-${task._id}`}
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 size={14} className="text-rose-400" />
        </button>
      </div>

      {editing ? (
        <input
          id={`task-title-input-${task._id}`}
          className="input text-sm font-medium py-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setTitle(task.title);
              setEditing(false);
            }
          }}
          autoFocus
          maxLength={120}
        />
      ) : (
        <p
          className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug cursor-pointer"
          onClick={() => setEditing(true)}
        >
          {task.title}
        </p>
      )}

      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          <Tag size={10} className="text-slate-400 mt-0.5 shrink-0" aria-hidden />
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}