import React, { useState, useRef, useEffect, useCallback } from "react";
import { Trash2, GripVertical, Pencil, Tag, MoreHorizontal,
         ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoardStore, getColumnTasks } from "../store/useBoardStore.js";
import { computeOrderIndex } from "../utils/order.js";
import { COLUMN_ORDER, COLUMN_LABELS } from "../utils/constants.js";
import PriorityBadge from "./ui/PriorityBadge.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import TaskModal from "./TaskModal.jsx";

/**
 * KebabMenu
 *
 * Context menu with three groups:
 *   1. "Move up" / "Move down"   — reorder within the same column
 *   2. "Move to <other column>"  — move to a different column
 *   3. None needed; Edit/Delete are in the top row
 *
 * Fully keyboard-accessible: arrow keys navigate, Enter/Space activate,
 * Escape closes.  Each item has role="menuitem" inside role="menu".
 */
function KebabMenu({ task, columnTasks, onClose }) {
  const menuRef = useRef(null);
  const moveTask = useBoardStore((s) => s.moveTask);

  // Index of this card in its column (within all tasks array passed)
  const myIndex = columnTasks.findIndex((t) => t._id === task._id);
  const tasksWithoutMe = columnTasks.filter((t) => t._id !== task._id);

  const canMoveUp   = myIndex > 0;
  const canMoveDown = myIndex < columnTasks.length - 1;

  // Other columns this card can move to
  const otherColumns = COLUMN_ORDER.filter((c) => c !== task.columnId);

  function doMoveUp() {
    // "Up" means targetIndex = myIndex - 1 in the list without this card
    const newOrderIndex = computeOrderIndex(tasksWithoutMe, myIndex - 1);
    moveTask(task._id, task.columnId, newOrderIndex);
    onClose();
  }

  function doMoveDown() {
    // "Down" means targetIndex = myIndex + 1 in the list without this card
    const newOrderIndex = computeOrderIndex(tasksWithoutMe, myIndex + 1);
    moveTask(task._id, task.columnId, newOrderIndex);
    onClose();
  }

  function doMoveToColumn(colId) {
    // Get the current state of the target column from the store
    const state = useBoardStore.getState();
    const targetTasks = getColumnTasks(state, colId);
    // Place at the bottom of the target column
    const newOrderIndex = computeOrderIndex(targetTasks, targetTasks.length);
    moveTask(task._id, colId, newOrderIndex);
    onClose();
  }

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape; arrow key navigation
  useEffect(() => {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
    if (!items?.length) return;

    function handleKey(e) {
      if (e.key === "Escape") { onClose(); return; }
      const arr = Array.from(items);
      const focused = document.activeElement;
      const idx = arr.indexOf(focused);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        arr[(idx + 1) % arr.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        arr[(idx - 1 + arr.length) % arr.length]?.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    // Auto-focus first enabled item
    items[0]?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const itemCls =
    "w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs " +
    "text-slate-700 dark:text-slate-300 " +
    "hover:bg-slate-100 dark:hover:bg-slate-800 " +
    "focus:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800 " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Card actions"
      className="
        absolute right-0 top-7 z-50 min-w-[170px]
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-700
        rounded-xl shadow-lg py-1
      "
    >
      {/* Move within column */}
      <button
        role="menuitem"
        className={itemCls}
        onClick={doMoveUp}
        disabled={!canMoveUp}
        aria-disabled={!canMoveUp}
      >
        <ArrowUp size={13} aria-hidden /> Move up
      </button>
      <button
        role="menuitem"
        className={itemCls}
        onClick={doMoveDown}
        disabled={!canMoveDown}
        aria-disabled={!canMoveDown}
      >
        <ArrowDown size={13} aria-hidden /> Move down
      </button>

      {/* Separator */}
      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      {/* Move to other columns */}
      {otherColumns.map((colId) => (
        <button
          key={colId}
          role="menuitem"
          className={itemCls}
          onClick={() => doMoveToColumn(colId)}
        >
          <ArrowRight size={13} aria-hidden />
          Move to {COLUMN_LABELS[colId]}
        </button>
      ))}
    </div>
  );
}

/**
 * TaskCard
 *
 * Displays a single task card.  Reflects move state via CSS:
 *   pending    → subtle opacity pulse (motion-safe only)
 *   rolledBack → brief red border shake (motion-safe only)
 *
 * Wrapped in React.memo — only re-renders when the task prop reference
 * changes.  The parent (KanbanColumn) derives tasks with getColumnTasks
 * which only returns a new array when the column's data actually changes.
 */
function TaskCard({ task, columnTasks = [], isDragOverlay = false }) {
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [showEdit, setShowEdit]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);

  const { pending = false, rolledBack = false } = task;

  // ── dnd-kit sortable ──────────────────────────────────────────────────────
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task._id, disabled: isDragOverlay });

  const dndStyle = isDragOverlay
    ? {}
    : { transform: CSS.Transform.toString(transform), transition };

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTask(task._id);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  // ── CSS state classes ─────────────────────────────────────────────────────
  //
  // pending   : pulse via Tailwind animate-pulse, but only when not dragging.
  //             We guard with @media (prefers-reduced-motion: no-preference)
  //             by choosing a CSS variable approach — simpler: just skip the
  //             animation class when reduced motion is active.
  //
  // rolledBack: red ring + shake animation defined in index.css.

  const stateClasses = (() => {
    if (isDragging && !isDragOverlay) {
      return "opacity-40 ring-2 ring-indigo-400 shadow-md z-10";
    }
    if (rolledBack) {
      return "ring-2 ring-rose-400 motion-safe:animate-card-shake";
    }
    if (pending) {
      return "opacity-70 motion-safe:animate-pulse";
    }
    return "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700";
  })();

  return (
    <>
      <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={dndStyle}
        id={isDragOverlay ? undefined : `task-card-${task._id}`}
        className={`
          relative card p-3 flex flex-col gap-2 select-none group
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-xl shadow-sm transition-all duration-150
          ${stateClasses}
        `}
      >
        {/* ── Top row ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 shrink-0"
            aria-label="Drag task handle"
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>

          <PriorityBadge priority={task.priority} />

          {/* Action buttons — visible on hover / keyboard focus */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {/* Edit */}
            <button
              type="button"
              id={isDragOverlay ? undefined : `edit-task-${task._id}`}
              onClick={() => setShowEdit(true)}
              className="p-1 rounded text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              aria-label={`Edit ${task.title}`}
            >
              <Pencil size={13} aria-hidden />
            </button>

            {/* Delete */}
            <button
              type="button"
              id={isDragOverlay ? undefined : `delete-task-${task._id}`}
              onClick={() => setShowConfirm(true)}
              className="p-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={13} aria-hidden />
            </button>

            {/* Kebab menu trigger */}
            <div className="relative">
              <button
                type="button"
                id={isDragOverlay ? undefined : `menu-task-${task._id}`}
                onClick={() => setShowMenu((v) => !v)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                aria-label={`More options for ${task.title}`}
                aria-haspopup="true"
                aria-expanded={showMenu}
              >
                <MoreHorizontal size={13} aria-hidden />
              </button>

              {showMenu && !isDragOverlay && (
                <KebabMenu
                  task={task}
                  columnTasks={columnTasks}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Title ──────────────────────────────────────────────────────── */}
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* ── Description (2-line clamp) ──────────────────────────────────── */}
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* ── Tags ───────────────────────────────────────────────────────── */}
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

        {/* Pending indicator for screen readers */}
        {pending && (
          <span className="sr-only" aria-live="polite">
            Saving move…
          </span>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showEdit && <TaskModal task={task} onClose={() => setShowEdit(false)} />}

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

export default React.memo(TaskCard);
