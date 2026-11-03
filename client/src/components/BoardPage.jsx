import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useColumns } from "../hooks/useColumns.js";
import { useTaskStore } from "../store/useTaskStore.js";
import { COLUMN_ORDER } from "../utils/constants.js";
import { calculateNewOrderIndex } from "../utils/order.js";
import Navbar from "../components/Navbar.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import TaskCard from "../components/TaskCard.jsx";
import CreateTaskModal from "../components/CreateTaskModal.jsx";

/**
 * Decide above-or-below by comparing the DragOverlay's translated center Y
 * against the over-item's vertical midpoint.
 *
 * Using the OVERLAY rect (active.rect.current.translated) instead of raw
 * pointer Y is critical: the grab offset shifts the pointer away from the
 * card's visual center, so pointer-Y creates a mismatch between what the
 * overlay shows and where the card actually lands. The overlay rect is what
 * the user sees, so it must be the source of truth.
 *
 * Returns true  → insert BEFORE the over-item
 * Returns false → insert AFTER  the over-item
 */
function shouldInsertBefore(activeRect, overRect) {
  if (!activeRect || !overRect) return true;
  const overlayCenterY = activeRect.top + activeRect.height / 2;
  const overMidY = overRect.top + overRect.height / 2;
  return overlayCenterY < overMidY;
}

/**
 * Main board page — wires up DndContext, Kanban columns, and the create modal.
 */
export default function BoardPage() {
  const { columns, loading, error } = useColumns();
  const { tasks, moveTask } = useTaskStore();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Require moving 8px before activating drag so normal clicks aren't intercepted
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Custom collision detection: prefer pointerWithin so whichever card is
   * literally under the cursor wins; fall back to rectIntersection for gaps.
   */
  function collisionDetection(args) {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }

  function handleDragStart(event) {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // ── Bug fix i): dropped on itself with no movement ──────────────────────
    // When the card is released without moving, dnd-kit's pointerWithin
    // resolves to the column background (the active card is excluded from its
    // own collision zone) → targetIndex ends up at the column bottom.
    // Guard: if active === over AND column hasn't changed, nothing to do.
    if (activeId === overId) return;

    const currentTask = tasks.find((t) => t._id === activeId);
    if (!currentTask) return;

    // 1. Determine destination column and target index
    let targetColumnId;
    let targetIndex;

    const isOverColumn = COLUMN_ORDER.includes(overId);

    if (isOverColumn) {
      // Dropped on the column background — place at bottom
      targetColumnId = overId;
      const targetColumnTasks = tasks
        .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      targetIndex = targetColumnTasks.length;
    } else {
      // Dropped onto another task card
      const overTask = tasks.find((t) => t._id === overId);
      if (!overTask) return;

      targetColumnId = overTask.columnId;
      const targetColumnTasks = tasks
        .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const overIndex = targetColumnTasks.findIndex((t) => t._id === overId);
      if (overIndex < 0) {
        targetIndex = targetColumnTasks.length;
      } else {
        // ── Bug fix ii): use overlay center, not raw pointer ─────────────────
        // active.rect.current.translated is the live rect of the DragOverlay —
        // exactly what the user sees. Comparing ITS center to the over-item's
        // midpoint makes the visual and the drop position 100% consistent,
        // regardless of where on the card the user grabbed (top-left handle,
        // middle, bottom, etc.).
        const activeTranslated = active.rect.current.translated;
        const insertBefore = shouldInsertBefore(activeTranslated, over.rect);
        targetIndex = insertBefore ? overIndex : overIndex + 1;
      }
    }

    // Filter tasks of the target column (excluding the active card)
    const columnTasks = tasks
      .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // 2. Calculate fractional orderIndex
    const newOrderIndex = calculateNewOrderIndex(columnTasks, targetIndex);

    // 3. Skip if nothing changed (same column, essentially same position)
    if (
      currentTask.columnId === targetColumnId &&
      Math.abs(currentTask.orderIndex - newOrderIndex) < 0.0001
    ) {
      return;
    }

    // 4. Trigger optimistic move through Zustand
    await moveTask(activeId, {
      columnId: targetColumnId,
      orderIndex: newOrderIndex,
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-bg)]">
      {/* onActivity is a placeholder — the activity drawer is a future step */}
      <Navbar
        onNewTask={() => setShowCreate(true)}
        onActivity={() => {}}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag cards between columns to update their status.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-16 text-rose-500">
            <p className="font-medium">Could not load tasks</p>
            <p className="text-sm mt-1 text-slate-500">{error}</p>
          </div>
        )}

        {/* Board columns with DndContext */}
        {!loading && !error && (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((col) => (
                <KanbanColumn key={col.id} id={col.id} tasks={col.tasks} />
              ))}
            </div>

            {/* Drag overlay preview for smooth dragging visual.
                NOTE: Do NOT apply scale or rotate transforms here.
                DndKit tracks the overlay's logical DOM rect for collision
                detection (active.rect.current.translated). If we visually
                scale/rotate the overlay, its visual center drifts away from
                the logical rect center, making shouldInsertBefore compare
                the wrong Y position — causing the card to land one slot off
                from where the overlay appears to be. Keep transforms
                identity so visual and logical positions stay in sync. */}
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="shadow-xl opacity-90 pointer-events-none">
                  <TaskCard task={activeTask} isDragOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
