import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { COLUMN_LABELS } from "../utils/constants.js";
import { useTaskStore } from "../store/useTaskStore.js";
import TaskCard from "./TaskCard.jsx";

/**
 * One of the three Kanban columns.
 * - Droppable container via @dnd-kit/core useDroppable.
 * - Sortable context via @dnd-kit/sortable.
 * - Handles quick-add (title only, press Enter).
 */
export default function KanbanColumn({ id, tasks }) {
  const { createTask } = useTaskStore();
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);

  // Droppable zone for the column
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
    <section
      id={`column-${id}`}
      aria-label={COLUMN_LABELS[id]}
      className="flex flex-col gap-3 w-full"
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
            {COLUMN_LABELS[id]}
          </h2>
          {/* Card count badge */}
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`column min-h-[160px] p-2 rounded-xl flex flex-col gap-2 transition-colors ${
          isOver
            ? "bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-400/50"
            : "bg-slate-100/70 dark:bg-slate-900/40"
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Drop tasks here
            </p>
          </div>
        )}
      </div>

      {/* Quick-add bar */}
      <div className="flex items-center gap-2 px-1">
        <Plus size={14} className="text-slate-400 shrink-0" aria-hidden />
        <input
          id={`quick-add-${id}`}
          className="input text-sm py-1.5 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          placeholder="Add task… (Enter to save)"
          value={quickTitle}
          disabled={adding}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={handleQuickAdd}
          aria-label={`Quick add task to ${COLUMN_LABELS[id]}`}
        />
      </div>
    </section>
  );
}
