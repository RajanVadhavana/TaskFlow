import { Sun, Moon, Plus, Kanban } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar({ onNewTask }) {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Kanban size={20} className="text-indigo-500" aria-hidden />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
            TaskFlow
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            id="theme-toggle-btn"
            onClick={() => setDark((d) => !d)}
            className="btn-ghost p-2"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* New task */}
          <button
            id="new-task-btn"
            onClick={onNewTask}
            className="btn-primary"
          >
            <Plus size={16} aria-hidden />
            New Task
          </button>
        </div>
      </div>
    </header>
  );
}