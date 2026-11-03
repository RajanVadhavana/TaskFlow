import { useState } from "react";
import { Plus } from "lucide-react";
import { COLUMN_LABELS } from "../utils/constants.js";
import { useTaskStore } from "../store/useTaskStore.js";
import TaskCard from "./TaskCard.jsx";

export default function KanbanColumn({ id, tasks }) {
  const { createTask } = useTaskStore();
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);

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

  return (
    <section
      id={`column-${id}`}
      aria-label={COLUMN_LABELS[id]}
      className="flex flex-col gap-3 w-full"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
            {COLUMN_LABELS[id]}
          </h2>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="column">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}

        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-4">
            No tasks yet
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        <Plus size={14} className="text-slate-400 shrink-0" aria-hidden />
        <input
          id={`quick-add-${id}`}
          className="input text-sm py-1.5 flex-1"
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