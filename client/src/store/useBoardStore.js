import { create } from "zustand";
import { taskApi } from "../api/client.js";
import toast from "react-hot-toast";

/**
 * useBoardStore — Zustand store for the Kanban board.
 *
 * State shape:
 *   tasksById : Record<string, Task> — hash map keyed by _id (prevents duplicate cards)
 *   status    : 'idle' | 'loading' | 'error' — drives skeleton loading / error state
 *   error     : string | null
 *
 * Actions:
 *   fetchBoard : fetches all tasks from server, builds tasksById
 *   createTask : POST /api/tasks, updates store, toast
 *   updateTask : PATCH /api/tasks/:id, updates store, toast
 *   deleteTask : DELETE /api/tasks/:id, updates store, toast
 *   moveTask   : PATCH /api/tasks/:id/move, optimistic move + rollback
 */
export const useBoardStore = create((set, get) => ({
  tasksById: {},
  status: "idle",
  error: null,

  // ── Fetch Board ────────────────────────────────────────────────────────────
  fetchBoard: async () => {
    set({ status: "loading", error: null });
    try {
      const { tasks } = await taskApi.getAll();
      const tasksById = {};
      for (const t of tasks) {
        tasksById[t._id] = t;
      }
      set({ tasksById, status: "idle", error: null });
    } catch (err) {
      set({ error: err.message || "Failed to load board", status: "error" });
      toast.error("Failed to load tasks");
    }
  },

  // Alias for backward compatibility
  fetchTasks: () => get().fetchBoard(),

  // ── Create Task ────────────────────────────────────────────────────────────
  createTask: async (payload) => {
    try {
      const { task } = await taskApi.create(payload);
      set((state) => ({
        tasksById: {
          ...state.tasksById,
          [task._id]: task,
        },
      }));
      toast.success("Task created");
      return task;
    } catch (err) {
      toast.error(err.message || "Failed to create task");
      throw err;
    }
  },

  // ── Update Task ────────────────────────────────────────────────────────────
  updateTask: async (id, payload) => {
    try {
      const { task } = await taskApi.update(id, payload);
      set((state) => ({
        tasksById: {
          ...state.tasksById,
          [id]: task,
        },
      }));
      toast.success("Task updated");
      return task;
    } catch (err) {
      toast.error(err.message || "Failed to update task");
      throw err;
    }
  },

  // ── Delete Task ────────────────────────────────────────────────────────────
  deleteTask: async (id) => {
    try {
      await taskApi.remove(id);
      set((state) => {
        const next = { ...state.tasksById };
        delete next[id];
        return { tasksById: next };
      });
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete task");
      throw err;
    }
  },

  // ── Move Task (Optimistic with Rollback) ───────────────────────────────────
  moveTask: async (id, { columnId, orderIndex }) => {
    const lastConfirmed = get().tasksById[id];
    if (!lastConfirmed) return;

    // Optimistic update in store
    set((state) => ({
      tasksById: {
        ...state.tasksById,
        [id]: {
          ...lastConfirmed,
          columnId,
          orderIndex,
        },
      },
    }));

    try {
      const { task } = await taskApi.move(id, {
        columnId,
        orderIndex,
        version: lastConfirmed.version,
      });

      // Confirm with server authoritative task
      set((state) => ({
        tasksById: {
          ...state.tasksById,
          [id]: task,
        },
      }));
    } catch (err) {
      if (err.code === "STALE_VERSION" && err.serverTask) {
        set((state) => ({
          tasksById: {
            ...state.tasksById,
            [id]: err.serverTask,
          },
        }));
        toast.error("Card was updated elsewhere — refreshed to latest state.");
      } else {
        // Rollback to last confirmed snapshot
        set((state) => ({
          tasksById: {
            ...state.tasksById,
            [id]: lastConfirmed,
          },
        }));
        toast.error(err.message || "Failed to move task");
      }
    }
  },
}));

// ── Selector helpers ──────────────────────────────────────────────────────────

/**
 * getColumnTasks(state, columnId)
 *
 * Returns tasks for a column sorted ascending by orderIndex.
 * Storing tasks in a hash map guarantees a card can never appear twice.
 */
export function getColumnTasks(state, columnId) {
  const tasks = Object.values(state.tasksById || {});
  return tasks
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * getAllTasks(state)
 *
 * Returns flat array of all tasks.
 */
export function getAllTasks(state) {
  return Object.values(state.tasksById || {});
}

