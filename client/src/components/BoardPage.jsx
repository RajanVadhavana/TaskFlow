import { useState } from "react";
import { useColumns } from "../hooks/useColumns.js";
import Navbar from "../components/Navbar.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import CreateTaskModal from "../components/CreateTaskModal.jsx";

export default function BoardPage() {
  const { columns, loading, error } = useColumns();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar onNewTask={() => setShowCreate(true)} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag cards between columns to update their status.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16 text-rose-500">
            <p className="font-medium">Could not load tasks</p>
            <p className="text-sm mt-1 text-slate-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <KanbanColumn key={col.id} id={col.id} tasks={col.tasks} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}