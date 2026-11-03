# Architecture & Engineering Decisions (DECISIONS.md)

This document explains the key engineering decisions, trade-offs, and failure modes considered while building **TaskFlow**. It serves as reference material for code review and the live interview defense.

---

## 1. Card Ordering: Float `orderIndex` with Midpoints & Auto-Rebalance

### The Problem
In a Kanban board, reordering a card in an integer rank system (`rank: 1, 2, 3...`) requires updating the rank of every subsequent card in the column (`UPDATE tasks SET rank = rank + 1 WHERE columnId = ... AND rank >= target`). On a column with hundreds of cards, every drop triggers an $O(N)$ write cascade, high database write locks, and conflicts during concurrent moves.

### The Solution: Floating-point Midpoints with Gap of 1000
Every task has an `orderIndex` float field:
* **Empty Column**: First card gets `1000.0`.
* **Top of Column**: `firstCard.orderIndex - 1000.0`.
* **Bottom of Column**: `lastCard.orderIndex + 1000.0`.
* **Between Two Cards**: Midpoint: `(prev.orderIndex + next.orderIndex) / 2`.

### Why this is better
* Moving a card is strictly an $O(1)$ single-document update.
* Compound index `{ columnId: 1, orderIndex: 1 }` makes column reads blazing fast.

### Edge Case: Floating-Point Gap Collapse
Repeated insertions between the same two cards eventually cause the gap between float values to shrink.
* **Guard**: If a move results in a gap `< 0.001` (`REBALANCE_THRESHOLD`), `maybeRebalance(columnId)` re-indexes all tasks in that column with uniform gaps of 1000 (`1000, 2000, 3000...`).
* The API returns `{ task, rebalanced: true }`, prompting the client to refresh its local state silently.

---

## 2. Server Concurrency: Optimistic Concurrency Control (OCC)

### The Problem
Two users or two browser tabs moving the same card simultaneously will cause the second write to overwrite the first (the classic "lost update" problem) if using simple `findByIdAndUpdate`.

### The Solution: Atomic `findOneAndUpdate` with Version Filtering
Each task document maintains an integer `version` field (starts at `0`):
```javascript
const updated = await Task.findOneAndUpdate(
  { _id: id, version },
  { $set: { columnId, orderIndex }, $inc: { version: 1 } },
  { new: true }
);
```

### Outcome Matrix
1. **Version Matches**: The update applies atomically and increments `version` by 1.
2. **Version Mismatch**: `updated` is `null`. The server checks if the task exists:
   * If task does not exist $\rightarrow$ `404 Not Found`.
   * If task exists with a newer version $\rightarrow$ returns `409 Conflict` with `{ code: "STALE_VERSION", task: latestTask }`.
3. **Pessimistic Locking vs OCC**: OCC was chosen because Kanban card collisions are relatively infrequent compared to total interactions. OCC avoids holding database transaction locks and keeps throughput high.

---

## 3. Client Concurrency: Per-Task Promise Queue & Epoch Invalidation

### The Problem
On high-latency connections (e.g. 3G with 1500ms RTT), a user might drag card X from "To Do" to "In Progress", then immediately to "Done" before the first move completes:
* **Without a Queue**: Move-1 sends `version: 0`. Move-2 fires 200ms later, also reading `version: 0`. Move-2 fails with `409 STALE_VERSION`, reverting the user's second drop even though their intent was legitimate.
* **Global Queue**: Serializing *all* card moves globally would freeze card Y while card X is waiting on network I/O.

### The Solution: Per-Task Promise Chains (`Map<taskId, Promise>`)
1. **Independent Queues**: Moves are serialized per card via `_moveQueues = new Map<taskId, Promise>()`.
   * Move-1 of Card A and Move-1 of Card B execute in **parallel**.
   * Move-2 of Card A waits on the tail promise of Move-1 of Card A.
2. **Current Confirmed Version**: When Move-2 starts executing, it reads `current.lastConfirmed.version` (which was updated by Move-1's server response), sending the correct incremented version.
3. **Epoch Counter for Rollback Invalidation**:
   * If Move-1 fails (network drop or 500 error), Card A must roll back.
   * But what happens to Move-2 and Move-3 already waiting in Card A's queue?
   * We bump `_moveEpochs.get(taskId)`. When Move-2 awakens from the queue, it detects that its captured epoch is stale and aborts immediately without sending an invalid request.

---

## 4. Optimistic UI & Rollback Architecture

### The Problem
Waiting for server confirmation before updating the UI feels sluggish (150–1500ms latency). However, updating optimistically without a robust rollback mechanism risks leaving the UI permanently out-of-sync with the server on failure.

### The Solution: `lastConfirmed` Snapshot
Every task in the Zustand store holds:
```javascript
lastConfirmed: {
  columnId: task.columnId,
  orderIndex: task.orderIndex,
  version: task.version
}
```
* **Optimistic Phase**: When the user drops a card, the store immediately updates `tasksById[id]` with the target `columnId` and `orderIndex`, sets `pending: true`, and queues the request.
* **Success Phase**: Server responds with confirmed task doc $\rightarrow$ store updates `lastConfirmed` and clears `pending` if no further moves are queued.
* **Failure Phase (5xx or Network Drop)**:
  1. Task reverts immediately to `lastConfirmed`.
  2. `_moveEpochs` increments to cancel queued zombie moves.
  3. `rolledBack: true` triggers a CSS red-ring shake animation (`animate-card-shake`) respecting `prefers-reduced-motion`.
  4. User is notified via `toast.error("Couldn't move '...'. Reverted.")`.
* **409 Conflict Phase**: If a stale version conflict occurs, the store refetches the board to synchronize with the external change and displays an informative toast.

---

## 5. State Shape: ID-Keyed Map (`tasksById`) vs Array

### The Decision
Tasks in Zustand are stored as a hash map (`Record<string, Task>`) rather than an array (`Task[]`).

### Why?
1. **Zero Duplicate Risk**: Writing `tasksById[id] = task` is idempotent. Arrays are prone to accidental duplicates when optimistic insertions, re-fetches, or web socket events race.
2. **$O(1)$ Lookup & Update**: Retrieving or updating a task by ID does not require iterating over the collection ($O(N)$).
3. **Derived Selectors**: Columns derive their sorted arrays on demand using `getColumnTasks(state, columnId)`, which sorts only that column's subset of cards.

---

## 6. Audit & Activity Logging: Post-Write & Non-Blocking

### The Requirements
Record human-readable activity strings (e.g. `Task 'Auth' moved from 'To Do' to 'In Progress' by User`) for every create, update, move, reorder, and delete operation.

### Key Architectural Decisions
1. **Non-Blocking Post-Write Execution**: `logActivity(...)` is called **after** the primary task operation succeeds in MongoDB.
2. **Isolation via `try/catch`**: The logging call is wrapped in an internal `try/catch`. An error in the audit service (e.g. disk full, schema error) **never aborts the user's primary request**.
3. **Same-Column Detection**: In `moveTask`, the controller inspects `existing.columnId` before update. If `existing.columnId === newColumnId`, action is logged as `"reordered"`, otherwise `"moved"`.
4. **Cursor-Based Pagination**: `GET /api/activity?limit=30&before=<ISO>` uses `{ createdAt: { $lt: beforeDate } }` sorted `{ createdAt: -1 }`. Unlike `skip/limit` offset pagination, cursor pagination never skips or duplicates records when new activities are inserted while a user is scrolling.

---

## 7. Security & API Contract Hardening

1. **Strict Zod Schemas**:
   * `updateTaskSchema` uses `.strict()`, rejecting unlisted keys like `orderIndex` or `version`. This prevents clients from bypassing the dedicated `/move` concurrency checkpoint.
2. **Sanitized Error Responses**:
   * Global `errorHandler` returns uniform JSON: `{ error: string, code?: string }`.
   * In production (`NODE_ENV === "production"`), stack traces and internal Mongoose error details are hidden to prevent information disclosure.
3. **Graceful Server Shutdown**:
   * `server.js` listens for `SIGTERM` and `SIGINT`, stopping the HTTP server from accepting new traffic, draining ongoing requests, and disconnecting Mongoose before exiting.

---

## 8. Accessibility (WCAG 2.1 AA) & Performance

1. **Card Stacking & Portals**: Modals and slide-overs render into `document.body` via React Portals to prevent z-index clipping. Menus elevate card stacking context with `z-30`.
2. **Keyboard Traps & Focus Return**: Modals trap focus between interactive elements and return focus to the triggering element upon closure (`newTaskBtnRef`).
3. **Screen Reader Live Announcements**: An ARIA live region (`aria-live="assertive"`) speaks drag-and-drop outcomes (e.g. `"Moved 'Task A' to In Progress"`).
4. **Selective Re-renders**: `TaskCard` is wrapped in `React.memo` with narrow prop bindings so that dragging one card does not re-render unaffected cards in other columns.
