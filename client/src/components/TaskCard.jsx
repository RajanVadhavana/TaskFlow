import React, { useState } from "react";
import { Trash2, GripVertical, Pencil, Tag } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoardStore } from "../store/useBoardStore.js";
import PriorityBadge from "./ui/PriorityBadge.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import TaskModal from "./TaskModal.jsx";

/**
 * TaskCard
 *
 * A single task card on the board.
 *  - Drag-and-drop via @dnd-kit/sortable (disabled in DragOverlay mode).
 *  - Edit (pencil) and Delete (trash) icon buttons visible on hover/focus.
 *  - Full EditTaskModal and ConfirmDialog instead of window.prompt/confirm.
 *  - Wrapped in React.memo so a card only re-renders when its own task changes.
 *    The parent subscribes with getColumnTasks which returns a new array only
 *    when a task in that column actually changes.
 *
 * Props:
 *   task          : Task object
 *   isDragOverlay : boolean – pass true when rendering inside <DragOverlay>
 *                  so the hook is disabled and no extra droppable is registered.
 */
function TaskCard({ task, isDragOverlay = false }) {
  // Narrow selector ensures TaskCard only re-renders when its own props change,
  // not on arbitrary store mutations.
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [showEdit, setShowEdit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // @dnd-kit sortable hook — disabled when rendered as the drag overlay clone.
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

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTask(task._id);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={style}
        id={isDragOverlay ? undefined : `task-card-${task._id}`}
        className={`
          card p-3 flex flex-col gap-2 select-none group
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-xl shadow-sm
          transition-all duration-150
          ${isDragging && !isDragOverlay
            ? "opacity-40 ring-2 ring-indigo-400 shadow-md z-10"
            : "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700"
          }
        `}
      >
        {/* Top row: drag handle + priority badge + action buttons */}
        <div className="flex items-center gap-2">
          {/* Drag handle — only the grip icon activates drag, not the whole card */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 shrink-0"
            aria-label="Drag task handle"
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>

          <PriorityBadge priority={task.priority} />

          {/* Edit + Delete — visible on hover OR keyboard focus (opacity trick) */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              id={isDragOverlay ? undefined : `edit-task-${task._id}`}
              onClick={() => setShowEdit(true)}
              className="p-1 rounded text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              aria-label={`Edit ${task.title}`}
            >
              <Pencil size={13} aria-hidden />
            </button>

            <button
              type="button"
              id={isDragOverlay ? undefined : `delete-task-${task._id}`}
              onClick={() => setShowConfirm(true)}
              className="p-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Description — 2-line clamp */}
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <Tag size={10} className="text-slate-400 shrink-0" aria-hidden />
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

      {/* Edit modal — shown when pencil icon is clicked */}
      {showEdit && (
        <TaskModal task={task} onClose={() => setShowEdit(false)} />
      )}

      {/* Confirm delete dialog — replaces window.confirm() */}
      {showConfirm && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${task.title}" will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// React.memo: only re-render when the task object reference changes.
// The parent passes a memoised slice via getColumnTasks so unchanged cards
// keep their previous object reference and skip reconciliation entirely.
export default React.memo(TaskCard);
