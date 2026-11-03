import { useState } from "react";
import Navbar from "./Navbar.jsx";
import { COLUMN_ORDER, COLUMN_LABELS } from "../utils/constants.js";

/**
 * Commit 8: Static presentation layout for verifying responsive columns and navbar.
 */
export default function BoardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar onNewTask={() => {}} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag cards between columns to update their status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMN_ORDER.map((colId) => (
            <section key={colId} className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                  {COLUMN_LABELS[colId]}
                </h2>
                <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5 font-medium">
                  0
                </span>
              </div>
              <div className="column">
                <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-8">
                  No tasks yet
                </p>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}