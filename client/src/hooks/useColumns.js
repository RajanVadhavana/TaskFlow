import { useEffect } from "react";
import { useBoardStore, getColumnTasks } from "../store/useBoardStore.js";
import { COLUMN_ORDER } from "../utils/constants.js";

/**
 * useColumns
 *
 * Groups tasks from useBoardStore by column in COLUMN_ORDER.
 * Automatically fetches the board on initial mount.
 */
export function useColumns() {
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const status = useBoardStore((s) => s.status);
  const error = useBoardStore((s) => s.error);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const columns = useBoardStore((state) =>
    COLUMN_ORDER.map((id) => ({
      id,
      tasks: getColumnTasks(state, id),
    }))
  );

  return {
    columns,
    loading: status === "loading",
    status,
    error,
    refetch: fetchBoard,
  };
}
