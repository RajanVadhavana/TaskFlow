/**
 * useTaskStore — alias wrapper around useBoardStore for backwards compatibility.
 */
import { useBoardStore, getColumnTasks, getAllTasks } from "./useBoardStore.js";

export { useBoardStore, getColumnTasks, getAllTasks };
export const useTaskStore = useBoardStore;
