import { create } from "zustand";
import { taskApi } from "../api/client.js";
import toast from "react-hot-toast";

// ── Per-task move queues ───────────────────────────────────────────────────────
//
// WHY A QUEUE PER TASK?
//
// Drag-and-drop events fire faster than HTTP round-trips on slow connections.
// If a user moves card X twice within 500 ms on a 3G link (~1500 ms RTT):
//   - Move-1 fires at t=0, Move-2 fires at t=200 ms.
//   - Without a queue, Move-2 sends version=1 (same as Move-1) → 409 STALE.
//   - With a queue, Move-2 waits for Move-1 to confirm, then reads the
//     server-confirmed version=2 and sends it → succeeds.
//
// Moves of DIFFERENT tasks run fully in parallel — each task has its own
// independent queue.  A failure in card A never blocks or rolls back card B.
//
// _moveQueues : Map<taskId, Promise>  – tail of each task's promise chain
// _moveEpochs : Map<taskId, number>  – incremented on every rollback;
//   queued continuations capture their epoch and bail if it has changed,
//   cancelling "zombie" moves that were enqueued before a failure.

const _moveQueues = new Map();
const _moveEpochs = new Map();

/**
 * useBoardStore — Zustand store for the Kanban board.
 *
 * STATE SHAPE
 *   tasksById : Record<string, Task>
 *     Each task also carries:
 *       lastConfirmed : { columnId, orderIndex, version }
 *         The last position the server acknowledged.
 *         Used as the rollback target if a move fails.
 *       pending   : boolean  – true while at least one move is in-flight
 *       rolledBack: boolean  – true for one render cycle to trigger animation
 *
 *   status : 'idle' | 'loading' | 'error'
 *   error  : string | null
 *
 * WHY id-KEYED MAP PREVENTS DUPLICATE CARDS:
 *   tasksById[id] = task overwrites the same slot every time.
 *   An array push() could push the same task twice during optimistic updates
 *   or reorderings, producing duplicate React keys and split rendering bugs.
 *   The map approach is structurally duplicate-proof.
 *
 * ── SCENARIO: 5 rapid moves of card X on 3G ─────────────────────────────────
 *
 *   t=0   User drags X to pos-A. UI updates instantly (optimistic).
 *         Move-1 queued (chain=[M1]).
 *   t=150 User drags again → pos-B. UI updates.
 *         Move-2 appended (chain=[M1,M2]).
 *   t=300 → M3, t=450 → M4, t=600 → M5. All optimistic; chain=[M1..M5].
 *   t=1500 Server confirms M1. lastConfirmed.version bumped.
 *          M2 starts — reads updated version from lastConfirmed. Fires PATCH.
 *   t=3000 M2 confirmed. M3 starts. And so on.
 *   t=7500 M5 confirmed. pending cleared. Board shows authoritative state.
 *
 *   If M3 fails (network dropout):
 *     → X rolled back to M2's confirmed position.
 *     → epoch bumped; M4 and M5 see stale epoch → skip silently.
 *     → Only ONE error toast fires ("Couldn't move 'X'. Reverted.").
 *     → Card Y that was moving in parallel is completely unaffected.
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
        tasksById[t._id] = {
          ...t,
          // lastConfirmed is our rollback anchor.
          lastConfirmed: {
            columnId: t.columnId,
            orderIndex: t.orderIndex,
            version: t.version,
          },
          pending: false,
          rolledBack: false,
        };
      }
      set({ tasksById, status: "idle", error: null });
    } catch (err) {
      set({ error: err.message || "Failed to load board", status: "error" });
      toast.error("Failed to load tasks");
    }
  },

  // Alias for backward compatibility (useColumns.js uses this)
  fetchTasks: () => get().fetchBoard(),

  // ── Create Task ────────────────────────────────────────────────────────────
  createTask: async (payload) => {
    try {
      const { task } = await taskApi.create(payload);
      set((state) => ({
        tasksById: {
          ...state.tasksById,
          [task._id]: {
            ...task,
            lastConfirmed: {
              columnId: task.columnId,
              orderIndex: task.orderIndex,
              version: task.version,
            },
            pending: false,
            rolledBack: false,
          },
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
      set((state) => {
        const existing = state.tasksById[id] || {};
        return {
          tasksById: {
            ...state.tasksById,
            [id]: {
              ...existing,
              ...task,
              // Server may have bumped version; keep lastConfirmed in sync.
              lastConfirmed: {
                columnId: task.columnId,
                orderIndex: task.orderIndex,
                version: task.version,
              },
            },
          },
        };
      });
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
      // Drop the queue so no zombie moves fire after deletion.
      _moveQueues.delete(id);
      _moveEpochs.delete(id);
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete task");
      throw err;
    }
  },

  // ── Move Task ─────────────────────────────────────────────────────────────
  //
  // Callers (BoardPage drag-end handler and the card kebab menu) must
  // pre-compute `newOrderIndex` with computeOrderIndex() before calling this.
  //
  // moveTask(taskId, toColumnId, newOrderIndex)
  //
  // Step-by-step:
  //   a) Apply optimistic update SYNCHRONOUSLY (no await before set()).
  //      Mark the task pending.
  //   b) Append a network call to this task's promise chain.
  //      The chain enforces strict ordering for the same card.
  //   c) Inside the continuation, re-read lastConfirmed.version to get the
  //      version the server last confirmed (may be newer than at click time).
  //   d) On success: update lastConfirmed and clear pending.
  //   e) On 409: refetch board; show info toast.
  //   f) On other errors: bump epoch, rollback to lastConfirmed, cancel
  //      still-queued moves, show error toast, then clear rolledBack after
  //      animation (~700 ms).
  moveTask: (taskId, toColumnId, newOrderIndex) => {
    const task = get().tasksById[taskId];
    if (!task) return;

    // ── a) Optimistic update — synchronous ────────────────────────────────
    set((state) => ({
      tasksById: {
        ...state.tasksById,
        [taskId]: {
          ...state.tasksById[taskId],
          columnId: toColumnId,
          orderIndex: newOrderIndex,
          pending: true,
          rolledBack: false,
        },
      },
    }));

    // ── b) Enqueue network call ───────────────────────────────────────────
    // Capture epoch at enqueue time.  If a rollback fires before this
    // continuation executes, we'll see a different epoch and skip.
    if (!_moveEpochs.has(taskId)) _moveEpochs.set(taskId, 0);
    const epochAtEnqueue = _moveEpochs.get(taskId);

    const previousTail = _moveQueues.get(taskId) ?? Promise.resolve();

    const newTail = previousTail.then(async () => {
      // Bail if epoch changed (rollback happened → this move is cancelled).
      if (_moveEpochs.get(taskId) !== epochAtEnqueue) return;

      // Read the CURRENT confirmed version, not the version at click-time.
      // An earlier move in this chain may have updated it.
      const current = get().tasksById[taskId];
      if (!current) return; // task deleted while queued

      const { version: confirmedVersion } = current.lastConfirmed;

      try {
        const { task: serverTask } = await taskApi.move(taskId, {
          columnId: toColumnId,
          orderIndex: newOrderIndex,
          version: confirmedVersion,
        });

        // ── c/d) Success: update lastConfirmed ────────────────────────────
        set((state) => {
          const existing = state.tasksById[taskId];
          if (!existing) return {};

          // Is this the last move in the chain?
          const isLast = _moveQueues.get(taskId) === newTail;

          // Server signals gap collapse → schedule a silent refetch.
          if (serverTask.rebalanced) {
            setTimeout(() => get().fetchBoard(), 0);
          }

          return {
            tasksById: {
              ...state.tasksById,
              [taskId]: {
                ...existing,
                ...serverTask,
                lastConfirmed: {
                  columnId: serverTask.columnId,
                  orderIndex: serverTask.orderIndex,
                  version: serverTask.version,
                },
                pending: !isLast, // still pending if more moves are queued
                rolledBack: false,
              },
            },
          };
        });
      } catch (err) {
        // ── e) 409 STALE_VERSION ──────────────────────────────────────────
        if (err.status === 409) {
          toast(`Card moved elsewhere — refreshing.`, { icon: "ℹ️" });
          // Bump epoch so remaining queued moves skip.
          _moveEpochs.set(taskId, (_moveEpochs.get(taskId) ?? 0) + 1);
          _moveQueues.delete(taskId);
          get().fetchBoard();
          return;
        }

        // ── f) Network / 5xx failure ──────────────────────────────────────
        // Bump epoch → cancels all still-queued continuations for this task.
        _moveEpochs.set(taskId, (_moveEpochs.get(taskId) ?? 0) + 1);
        _moveQueues.delete(taskId);

        // Roll back to the last server-confirmed position.
        set((state) => {
          const existing = state.tasksById[taskId];
          if (!existing) return {};
          const lc = existing.lastConfirmed;
          return {
            tasksById: {
              ...state.tasksById,
              [taskId]: {
                ...existing,
                columnId: lc.columnId,
                orderIndex: lc.orderIndex,
                version: lc.version,
                pending: false,
                rolledBack: true, // triggers shake animation in TaskCard
              },
            },
          };
        });

        const taskTitle = get().tasksById[taskId]?.title ?? "Card";
        toast.error(`Couldn't move '${taskTitle}'. Reverted.`);

        // Clear rolledBack after animation has played (~700 ms).
        setTimeout(() => {
          set((state) => {
            const t = state.tasksById[taskId];
            if (!t) return {};
            return {
              tasksById: {
                ...state.tasksById,
                [taskId]: { ...t, rolledBack: false },
              },
            };
          });
        }, 700);
      }
    });

    // Store the new tail for the next move to chain onto.
    _moveQueues.set(taskId, newTail);
  },
}));

// ── Selector helpers ───────────────────────────────────────────────────────────

/**
 * getColumnTasks(state, columnId)
 *
 * Returns tasks for a column sorted ascending by orderIndex.
 * Because tasks are stored in a id-keyed map, the same task id
 * can never occupy two entries — duplicates are structurally impossible.
 */
export function getColumnTasks(state, columnId) {
  return Object.values(state.tasksById)
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/** getAllTasks — flat array for BoardPage's drag-end logic. */
export function getAllTasks(state) {
  return Object.values(state.tasksById);
}
