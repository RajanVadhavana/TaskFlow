import React, { useState } from "react";
import { Plus, Inbox } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { COLUMN_LABELS } from "../utils/constants.js";
import { useBoardStore } from "../store/useBoardStore.js";
import TaskCard from "./TaskCard.jsx";
import TaskModal from "./TaskModal.jsx";

/**
 * KanbanColumn
 *
 * Represents one of the 3 columns on the board.
 * - Header with column name, count badge, and "+" add button.
 * - Droppable container for @dnd-kit cards.
 * - Scrollable body with custom scrollbar.
 * - Friendly empty state when no cards exist.
 * - Quick-add input at the bottom (Enter to create).
 *
 * Props:
 *   id    : string ("todo" | "in-progress" | "done")
 *   tasks : Task[] (sorted by orderIndex)
 */
export default function KanbanColumn({ id, tasks }) {
  // Narrow selector so column component only re-renders when relevant
  const createTask = useBoardStore((s) => s.createTask);
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Droppable zone for dnd-kit
  const { setNodeRef, isOver } = useDroppable({ id });

  async function handleQuickAdd(e) {
    if (e.key !== "Enter") return;
    const title = quickTitle.trim();
    if (!title) return;

    setAdding(true);
    try {
      await createTask({ title, columnId: id, priority: "Medium" });
      setQuickTitle("");
    } finally {
      setAdding(false);
    }
  }

  const taskIds = tasks.map((t) => t._id);

  return (
    <>
      <section
        id={`column-${id}`}
        aria-label={COLUMN_LABELS[id]}
        className="flex flex-col gap-3 w-full bg-slate-100/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
      >
        {/* Column Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              {COLUMN_LABELS[id]}
            </h2>
            {/* Count badge */}
            <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2 py-0.5 font-medium tabular-nums">
              {tasks.length}
            </span>
          </div>

          {/* "+" Add task button */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`Add task to ${COLUMN_LABELS[id]}`}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Scrollable cards container */}
        <div
          ref={setNodeRef}
          className={`column min-h-[180px] max-h-[calc(100vh-240px)] overflow-y-auto p-1.5 rounded-xl flex flex-col gap-2.5 transition-colors ${
            isOver
              ? "bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-400/50"
              : "bg-transparent"
          }`}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </SortableContext>

          {/* Friendly empty state */}
          {tasks.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center px-4">
              <div className="w-9 h-9 rounded-full bg-slate-200/70 dark:bg-slate-800/70 flex items-center justify-center text-slate-400 mb-2">
                <Inbox size={18} aria-hidden />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No tasks here yet
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Drop a card or click + to add one
              </p>
            </div>
          )}
        </div>

        {/* Quick-add bar */}
        <div className="flex items-center gap-2 px-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          <Plus size={14} className="text-slate-400 shrink-0" aria-hidden />
          <input
            id={`quick-add-${id}`}
            className="input text-xs py-1.5 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="Add task… (Enter to save)"
            value={quickTitle}
            disabled={adding}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            aria-label={`Quick add task to ${COLUMN_LABELS[id]}`}
          />
        </div>
      </section>

      {/* Task creation modal when clicking "+" */}
      {showModal && (
        <TaskModal
          defaultColumnId={id}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
