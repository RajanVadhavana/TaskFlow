import { ORDER_GAP } from "./constants.js";

/**
 * REBALANCE_THRESHOLD
 *
 * When the gap between two adjacent orderIndex values drops below this, the
 * server will rebalance the whole column (spread cards back to multiples of
 * ORDER_GAP).  We expose this constant so the store can detect it.
 */
export const REBALANCE_THRESHOLD = 0.001;

/**
 * computeOrderIndex(columnTasksSortedWithoutMovedTask, targetIndex)
 *
 * Pure function — no side effects, no store access, trivially unit-testable.
 *
 * Given the CURRENT sorted list of tasks in the DESTINATION column
 * (with the task being moved already removed) and the target slot, returns
 * the new floating-point orderIndex for that slot.
 *
 * ORDERING RULES (mirrors server spec exactly):
 *  1. Empty column          → ORDER_GAP (1000)
 *  2. Top of column         → first.orderIndex  - ORDER_GAP
 *  3. Bottom of column      → last.orderIndex   + ORDER_GAP
 *  4. Between two cards     → (prev.orderIndex  + next.orderIndex) / 2
 *
 * EXAMPLE CASES:
 *
 *   Column = []   ,  targetIndex = 0
 *   → 1000   (rule 1: empty)
 *
 *   Column = [{orderIndex:1000}, {orderIndex:2000}],  targetIndex = 0
 *   → 0      (rule 2: top — 1000 - 1000)
 *
 *   Column = [{orderIndex:1000}, {orderIndex:2000}],  targetIndex = 2
 *   → 3000   (rule 3: bottom — 2000 + 1000)
 *
 *   Column = [{orderIndex:1000}, {orderIndex:3000}],  targetIndex = 1
 *   → 2000   (rule 4: midpoint — (1000 + 3000) / 2)
 *
 *   Column = [{orderIndex:1000}, {orderIndex:1001}],  targetIndex = 1
 *   → 1000.5 (rule 4: midpoint — tiny gap, triggers needsRebalance)
 *
 * @param {Array<{orderIndex: number}>} columnTasks
 *   Tasks in the destination column, sorted ascending, excluding the moved task.
 * @param {number} targetIndex
 *   0-based index of the slot the task is dropped into.
 * @returns {number} New orderIndex value.
 */
export function computeOrderIndex(columnTasks, targetIndex) {
  // Rule 1: empty column
  if (!columnTasks || columnTasks.length === 0) {
    return ORDER_GAP;
  }

  // Rule 2: dropped before the first card
  if (targetIndex <= 0) {
    return columnTasks[0].orderIndex - ORDER_GAP;
  }

  // Rule 3: dropped after the last card
  if (targetIndex >= columnTasks.length) {
    return columnTasks[columnTasks.length - 1].orderIndex + ORDER_GAP;
  }

  // Rule 4: dropped between two existing cards — midpoint avoids integer bias
  const prev = columnTasks[targetIndex - 1].orderIndex;
  const next = columnTasks[targetIndex].orderIndex;
  return (prev + next) / 2;
}

/**
 * needsRebalance(columnTasks)
 *
 * Returns true if any adjacent pair in the sorted list has a gap smaller
 * than REBALANCE_THRESHOLD.  Used as a client-side hint — the server is the
 * authoritative source; this just lets us act early.
 *
 * @param {Array<{orderIndex: number}>} columnTasks  Sorted ascending.
 * @returns {boolean}
 */
export function needsRebalance(columnTasks) {
  for (let i = 1; i < columnTasks.length; i++) {
    if (columnTasks[i].orderIndex - columnTasks[i - 1].orderIndex < REBALANCE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * calculateNewOrderIndex — legacy alias kept so BoardPage.jsx doesn't break.
 * Delegates to computeOrderIndex.
 */
export function calculateNewOrderIndex(columnTasks, targetIndex) {
  return computeOrderIndex(columnTasks, targetIndex);
}
