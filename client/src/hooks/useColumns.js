import { useEffect } from "react";
import { useTaskStore } from "../store/useTaskStore.js";
import { COLUMN_ORDER } from "../utils/constants.js";

/**
 * Returns tasks grouped by column in the correct display order.
 * Re-derives on every store change — no extra state needed.
 */
export function useColumns() {
  const { tasks, loading, error, fetchTasks } = useTaskStore();

  // Fetch once on mount.  fetchTasks is stable (Zustand doesn't recreate it),
  // so this effect only runs once.
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group tasks by columnId, sorted by orderIndex within each group.
  const columns = COLUMN_ORDER.map((id) => ({
    id,
    tasks: tasks
      .filter((t) => t.columnId === id)
      .sort((a, b) => a.orderIndex - b.orderIndex),
  }));

  return { columns, loading, error };
}
