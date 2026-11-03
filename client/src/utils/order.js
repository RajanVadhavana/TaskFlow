import { ORDER_GAP } from "./constants.js";

/**
 * calculateNewOrderIndex
 *
 * Computes the new fractional orderIndex when a card is dropped into a target column
 * at a specific target index (0-based index in the destination list).
 *
 * Rules (mirrors the server spec):
 *  1. Empty column: returns ORDER_GAP (1000).
 *  2. Inserted at top (index === 0): returns firstCard.orderIndex - ORDER_GAP.
 *  3. Inserted at bottom (index >= items.length): returns lastCard.orderIndex + ORDER_GAP.
 *  4. Inserted between two cards (index > 0): returns midpoint (prev.orderIndex + next.orderIndex) / 2.
 *
 * @param {Array} columnTasks - current tasks in destination column (excluding the dragged card if already in column)
 * @param {number} targetIndex - position where the card is placed in columnTasks
 * @returns {number} the new orderIndex
 */
export function calculateNewOrderIndex(columnTasks, targetIndex) {
  if (!columnTasks || columnTasks.length === 0) {
    return ORDER_GAP;
  }

  // Dropped at the very top (before the first card)
  if (targetIndex <= 0) {
    const firstOrder = columnTasks[0].orderIndex;
    return firstOrder - ORDER_GAP;
  }

  // Dropped at the very bottom (after the last card)
  if (targetIndex >= columnTasks.length) {
    const lastOrder = columnTasks[columnTasks.length - 1].orderIndex;
    return lastOrder + ORDER_GAP;
  }

  // Dropped between columnTasks[targetIndex - 1] and columnTasks[targetIndex]
  const prevOrder = columnTasks[targetIndex - 1].orderIndex;
  const nextOrder = columnTasks[targetIndex].orderIndex;
  return (prevOrder + nextOrder) / 2;
}

