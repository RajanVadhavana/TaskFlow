import { useEffect } from "react";
import { useTaskStore } from "../store/useTaskStore.js";
import { COLUMN_ORDER } from "../utils/constants.js";

/**
 * Returns tasks grouped by column in the correct display order.
 */
export function useColumns() {
  const { tasks, loading, error, fetchTasks } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const columns = COLUMN_ORDER.map((id) => ({
    id,
    tasks: tasks
      .filter((t) => t.columnId === id)
      .sort((a, b) => a.orderIndex - b.orderIndex),
  }));

  return { columns, loading, error };
}