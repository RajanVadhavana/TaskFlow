import { create } from "zustand";
import { taskApi } from "../api/client.js";
import toast from "react-hot-toast";

/**
 * useTaskStore — single source of truth for all tasks in the UI.
 *
 * State shape:
 *   tasks        : Task[]   — flat array, sorted by columnId then orderIndex
 *   loading      : boolean  — true during the initial fetch
 *   error        : string | null
 *
 * The store never talks to the router or URL — it only owns task data.
 */
export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  // ── Fetch ──────────────────────────────────────────────────────────────────

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const { tasks } = await taskApi.getAll();
      set({ tasks, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      toast.error("Failed to load tasks");
    }
  },

  // ── Create ─────────────────────────────────────────────────────────────────

  createTask: async (payload) => {
    try {
      const { task } = await taskApi.create(payload);
      // Append to the end — the server sets the correct orderIndex.
      set((state) => ({ tasks: [...state.tasks, task] }));
      toast.success("Task created");
      return task;
    } catch (err) {
      toast.error(err.message || "Failed to create task");
      throw err;
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────

  updateTask: async (id, payload) => {
    // Optimistic update: swap in the new fields immediately.
    const prev = get().tasks.find((t) => t._id === id);
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id ? { ...t, ...payload } : t)),
    }));

    try {
      const { task } = await taskApi.update(id, payload);
      // Replace with the server's authoritative version (e.g. updated version field).
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === id ? task : t)),
      }));
      toast.success("Task updated");
    } catch (err) {
      // Roll back to the state before the optimistic update.
      if (prev) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === id ? prev : t)),
        }));
      }
      toast.error(err.message || "Failed to update task");
      throw err;
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────

  deleteTask: async (id) => {
    // Optimistic remove.
    const prev = get().tasks.find((t) => t._id === id);
    set((state) => ({ tasks: state.tasks.filter((t) => t._id !== id) }));

    try {
      await taskApi.remove(id);
      toast.success("Task deleted");
    } catch (err) {
      // Restore the task if the delete failed.
      if (prev) {
        set((state) => ({ tasks: [...state.tasks, prev] }));
      }
      toast.error(err.message || "Failed to delete task");
      throw err;
    }
  },

  // ── Move ───────────────────────────────────────────────────────────────────

  moveTask: async (id, { columnId, orderIndex }) => {
    // Snapshot the task before changing it — needed for rollback.
    const lastConfirmed = get().tasks.find((t) => t._id === id);
    if (!lastConfirmed) return;

    // Optimistic update: move the card in the UI immediately.
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t._id === id ? { ...t, columnId, orderIndex } : t
      ),
    }));

    try {
      const { task } = await taskApi.move(id, {
        columnId,
        orderIndex,
        version: lastConfirmed.version, // tell the server what version we had
      });

      // Replace with the server's authoritative version (version bumped, etc.)
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === id ? task : t)),
      }));
    } catch (err) {
      if (err.code === "STALE_VERSION" && err.serverTask) {
        // Another request won — reconcile with the server's latest state.
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t._id === id ? err.serverTask : t
          ),
        }));
        toast.error("Card was updated elsewhere — refreshed to latest state.");
      } else {
        // Unknown error — roll back to the snapshot.
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === id ? lastConfirmed : t)),
        }));
        toast.error(err.message || "Failed to move task");
      }
    }
  },
}));
