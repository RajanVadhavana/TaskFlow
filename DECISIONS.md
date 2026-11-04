# Architecture & Engineering Decisions (DECISIONS.md)

This document explains the key engineering decisions, trade-offs, and failure modes considered while building **TaskFlow**. It serves as reference material for code review and the live interview defense.

---

## 1. Card Ordering: Float `orderIndex` with Midpoints & Auto-Rebalance

### The Problem
In the kanban Board we need to keep track of each of the cards order in the board and then display them according to the rank or order in which they are placed. 

### The Solution: Floating-point Midpoints with Gap of 1000
Every task has an `orderIndex` float field:
* **Empty Column**: First card gets `1000.0`.
* **Top of Column**: `firstCard.orderIndex - 1000.0`.
* **Bottom of Column**: `lastCard.orderIndex + 1000.0`.
* **Between Two Cards**: Midpoint: `(prev.orderIndex + next.orderIndex) / 2`.

### Why this is better
* Moving a card is strictly an $O(1)$ single-document update.

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

## 8. AI Debugging & Hallucination Retrospective

### Example 1: Drag-and-Drop Cursor Placement & Inconsistent Drop Settlement Bug

* **The Problem Observed**:
  During `@dnd-kit` implementation, dragging a card produced an erratic visual mismatch: the drag overlay indicated the card was hovering over the upper section of a target card (leading the user to expect an "insert above" placement), but upon releasing the mouse, the card settled *below* the target card. The drag overlay preview and the final drop location were fundamentally inconsistent.

* **How the Error Was Spotted**:
  Through manual interactive board testing. When slowly dragging a card downward over an existing card, the drop preview would flicker or prematurely register the target slot as being above, yet releasing the pointer committed the card to the slot underneath.

* **The Underlying Bug / Suboptimal AI Suggestion**:
  The AI assistant initially suggested using unadjusted pointer coordinates (`pointerCoordinates.y`) combined with `@dnd-kit`'s static initial bounding rect (`active.rect.current.initial`).
  1. **Top-Left vs. Center Anchor Flaw**: The AI wrote calculation logic based on the top-left origin of the bounding box. When a user clicked and dragged a card from its middle or drag handle, the distance between the mouse pointer and the card's top-left origin skewed the collision boundary. Because the cursor placement was counted from the upper-left, the collision detection registered the card as having crossed the target boundary long before the visual card actually reached it.
  2. **Overlay Scale Distortion**: The AI added CSS transforms (`scale(1.05) rotate(2deg)`) to the drag preview. This visually magnified the card and moved its visual center away from the real coordinate rects evaluated by the physics engine.

* **How It Was Resolved**:
  1. Implemented a strict **Vertical Midpoint Intersection** function ([`shouldInsertBefore`](file:///d:/Coding/taskFlow/client/src/components/BoardPage.jsx#L29-L34)):
     ```javascript
     function shouldInsertBefore(activeRect, overRect) {
       if (!activeRect || !overRect) return true;
       const overlayCenterY = activeRect.top + activeRect.height / 2;
       const overMidY = overRect.top + overRect.height / 2;
       return overlayCenterY < overMidY;
     }
     ```
  2. Replaced the static initial rect with `active.rect.current.translated`—the live, real-time pixel coordinates of the floating card at the exact instant of release.
  3. Stripped away artificial scale/rotation transforms from `<DragOverlay>` and set `dropAnimation={null}` so the visual card boundary matched the mathematical collision rect 1:1.

---

### Example 2: The "Silent 500 Simulation" Hallucination

* **The Suboptimal AI Suggestion**:
  To implement the chaos engineering panel ("Simulate failure (500)"), the AI modified `client/src/api/client.js` to attach an `X-Simulate-Failure: true` header to outgoing HTTP requests. However, it completely hallucinated that Express would automatically know what to do with this header, failing to generate any server-side middleware.

* **How It Was Spotted**:
  Toggling "Simulate failure (500)" in the DevTools panel and moving a card did not trigger the rollback. Instead, the card moved successfully and persisted in MongoDB.

* **Underlying Bug**:
  The Express server simply ignored the unknown header and executed the database write as normal, returning `200 OK`. The client never received a 500 status code, so `useBoardStore` never triggered the rollback.

* **How It Was Resolved**:
  1. Added early-exit chaos middleware to [`server/src/app.js`](file:///d:/Coding/taskFlow/server/src/app.js#L26-L35) before any task routes:
     ```javascript
     app.use((req, res, next) => {
       if (req.headers["x-simulate-failure"] === "true") {
         return res.status(500).json({ error: "Simulated 500 server failure (DevTools)", code: "SIMULATED_FAILURE" });
       }
       next();
     });
     ```
  2. Added a deterministic client-side fail-safe in [`client/src/api/client.js`](file:///d:/Coding/taskFlow/client/src/api/client.js#L52-L55) that throws an `ApiError(500)` on mutations when `simulation.failure` is active, guaranteeing rollback testing even during offline demos.

---

## 9. High-Scale Failure Analysis (50,000 Tasks & 100 Concurrent Users)

### 1. The Very First Bottleneck That Will Break: Unpaginated Board Fetch & Event Loop Starvation

If TaskFlow scales to **50,000 active tasks** with **100 concurrent users**, the very first component that will fail is:
**`GET /api/tasks` in [`server/src/controllers/taskController.js`](file:///d:/Coding/taskFlow/server/src/controllers/taskController.js#L13-L16)**.

```javascript
export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find().sort({ columnId: 1, orderIndex: 1 }).lean();
  res.json({ tasks });
});
```

#### Why it breaks:
1. **Node.js Single-Threaded Event Loop Freezing**:
   * Loading 50,000 tasks from MongoDB allocates an in-memory array of roughly **25 MB to 40 MB** of JSON data per request.
   * Node.js must run `JSON.stringify()` on that 40 MB object. Because JSON serialization is synchronous and CPU-bound, serializing a 40 MB payload blocks the Node.js event loop for **300ms to 800ms**.
   * With 100 concurrent users refreshing or opening the board, the server's event loop will be 100% blocked for tens of seconds. All incoming requests (including `/api/health`, moves, and edits) will queue up and time out with **504 Gateway Timeout**.
2. **Client Browser Out-of-Memory (OOM) Crash**:
   * The client browser must download 40 MB of JSON, parse it with `JSON.parse()`, and instantiate 50,000 React component trees in the DOM.
   * Browsers cannot handle 50,000 unvirtualized complex DOM nodes; the tab's memory consumption will surge past 1.5 GB, causing the browser tab to crash or freeze completely.

#### Secondary Bottlenecks:
* **Column Auto-Rebalancing**: If a column holds 15,000 cards and a gap collapse occurs (`gap < 0.001`), `maybeRebalance` fetches all 15,000 tasks and executes a `bulkWrite` with 15,000 update operations, locking MongoDB collections and creating severe write replication lag across Atlas clusters.

---

### 2. How to Re-Architect for High Scale

To reliably support 50,000 tasks and 100+ concurrent team members, the architecture must transition to:

#### A. Viewport Virtualization & Paginated Columns
* **Server**: Convert `GET /api/tasks` to paginate by column: `GET /api/tasks?columnId=todo&limit=40&before=<orderIndex>`. The client only downloads the first 40 cards per column on initial load (reducing payload from 40 MB to ~40 KB).
* **Client**: Integrate DOM virtualization ([`@tanstack/react-virtual`](https://tanstack.com/virtual/latest) or `react-window`). Even if 10,000 tasks are loaded in memory, only the **12–15 cards physically visible on screen** are rendered in the DOM, recycling nodes as the user scrolls.

#### B. Fractional Indexing (Lexorank Strings)
* Replace floats with **Lexorank** (variable-length alphanumeric strings, e.g. `"0|hzzzzz:"` and `"0|i00000:"`).
* Lexorank allows virtually infinite string midpoints (by appending characters, e.g. `"a0"`, `"a0V"`, `"a1"`). This **completely eliminates the need for full-column rebalancing** (`maybeRebalance`) and eliminates bulk database writes forever.

#### C. Real-Time WebSocket Deltas (Socket.io / Redis PubSub)
* Current code refetches the entire board when encountering a `409 STALE_VERSION`. At 50,000 tasks, refetching the whole board on collision is catastrophic.
* Connect clients via WebSockets. When User A moves a card, the server broadcasts a lightweight mutation delta (`{ type: "TASK_MOVED", id, columnId, orderIndex, version }`) through Redis Pub/Sub to all connected clients.
* Clients update their local Zustand `tasksById` map in $O(1)$ time without making HTTP requests.

#### D. Database Read-Write Splitting & Caching
* Direct all read requests (`GET /api/tasks`, `GET /api/activity`) to **MongoDB Secondary Read Replicas**.
* Reserve the Primary Replica exclusively for atomic write operations (`PATCH /move`, `POST /tasks`).
* Cache column boundary order indexes in **Redis** so midpoint calculations do not query disk.
