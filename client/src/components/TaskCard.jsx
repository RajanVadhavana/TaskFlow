import React, { useState } from "react";
import { Trash2, GripVertical, Tag } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "../store/useTaskStore.js";
import PriorityBadge from "./ui/PriorityBadge.jsx";

/**
 * A single task card on the board.
 * - Supports drag-and-drop sorting via @dnd-kit/sortable.
 * - Drag handle on GripVertical keeps inline click-to-edit conflict-free.
 * - When rendered inside <DragOverlay> pass isDragOverlay={true} so the
 *   card skips the sortable hook entirely (avoids an extra droppable node).
 */
export default function TaskCard({ task, isDragOverlay = false }) {
  const { updateTask, deleteTask } = useTaskStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [deleting, setDeleting] = useState(false);

  // @dnd-kit sortable hook — disabled when rendered as the drag overlay clone
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, disabled: isDragOverlay });

  const style = isDragOverlay
    ? {} // overlay is positioned by DndContext itself
    : {
        // CSS.Transform (not Translate) keeps the ghost placeholder
        // anchored in its original position while the overlay follows
        // the pointer. Using Translate caused the ghost to jump/dance.
        transform: CSS.Transform.toString(transform),
        transition,
      };

  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      await updateTask(task._id, { title: trimmed });
    } else {
      setTitle(task.title); // revert if empty or unchanged
    }
    setEditing(false);
  }

  async function handleDelete(e) {
    e.stopPropagation(); // don't trigger the card's click
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
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      id={isDragOverlay ? undefined : `task-card-${task._id}`}
      className={`card p-3 flex flex-col gap-2 select-none group transition-shadow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${
        isDragging && !isDragOverlay
          ? "opacity-40 ring-2 ring-indigo-400 shadow-md z-10"
          : "hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Top row: drag handle + priority badge + delete */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Drag task handle"
          {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        >
          <GripVertical size={14} className="shrink-0" aria-hidden="true" />
        </button>

        <PriorityBadge priority={task.priority} />

        <button
          id={isDragOverlay ? undefined : `delete-task-${task._id}`}
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 size={14} className="text-rose-400" />
        </button>
      </div>

      {/* Title — click to edit inline */}
      {editing ? (
        <input
          id={`task-title-input-${task._id}`}
          className="input text-sm font-medium py-1 w-full"
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
          className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
          onClick={() => setEditing(true)}
        >
          {task.title}
        </p>
      )}

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
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
