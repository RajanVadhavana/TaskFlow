import { create } from "zustand";
import { taskApi } from "../api/client.js";
import toast from "react-hot-toast";

/**
 * useTaskStore — single source of truth for all tasks in the UI.
 */
export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  // Fetch
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

  // Create
  createTask: async (payload) => {
    try {
      const { task } = await taskApi.create(payload);
      set((state) => ({ tasks: [...state.tasks, task] }));
      toast.success("Task created");
      return task;
    } catch (err) {
      toast.error(err.message || "Failed to create task");
      throw err;
    }
  },

  // Update
  updateTask: async (id, payload) => {
    const prev = get().tasks.find((t) => t._id === id);
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id ? { ...t, ...payload } : t)),
    }));

    try {
      const { task } = await taskApi.update(id, payload);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === id ? task : t)),
      }));
      toast.success("Task updated");
    } catch (err) {
      if (prev) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === id ? prev : t)),
        }));
      }
      toast.error(err.message || "Failed to update task");
      throw err;
    }
  },

  // Delete
  deleteTask: async (id) => {
    const prev = get().tasks.find((t) => t._id === id);
    set((state) => ({ tasks: state.tasks.filter((t) => t._id !== id) }));

    try {
      await taskApi.remove(id);
      toast.success("Task deleted");
    } catch (err) {
      if (prev) {
        set((state) => ({ tasks: [...state.tasks, prev] }));
      }
      toast.error(err.message || "Failed to delete task");
      throw err;
    }
  },

  // Move
  moveTask: async (id, { columnId, orderIndex }) => {
    const lastConfirmed = get().tasks.find((t) => t._id === id);
    if (!lastConfirmed) return;

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t._id === id ? { ...t, columnId, orderIndex } : t
      ),
    }));

    try {
      const res = await taskApi.move(id, {
        columnId,
        orderIndex,
        version: lastConfirmed.version,
      });

      if (res.rebalanced) {
        get().fetchTasks();
      } else {
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === id ? res.task : t)),
        }));
      }
    } catch (err) {
      if (err.code === "STALE_VERSION" && err.serverTask) {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t._id === id ? err.serverTask : t
          ),
        }));
        toast.error("Card was updated elsewhere — refreshed to latest state.");
      } else {
        set((state) => ({
          tasks: state.tasks.map((t) => (t._id === id ? lastConfirmed : t)),
        }));
        toast.error(err.message || "Failed to move task");
      }
    }
  },
}));