import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
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
 * Main board page — wires up DndContext, Kanban columns, and the create modal.
 */
export default function BoardPage() {
  const { columns, loading, error } = useColumns();
  const { tasks, moveTask } = useTaskStore();
  const [showCreate, setShowCreate] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Require moving 5px before activating drag so normal clicks aren't intercepted
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event) {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const currentTask = tasks.find((t) => t._id === activeId);
    if (!currentTask) return;

    // 1. Determine destination column
    let targetColumnId;
    let targetIndex;

    const isOverColumn = COLUMN_ORDER.includes(overId);

    if (isOverColumn) {
      // Dropped on the column background
      targetColumnId = overId;
      const targetColumnTasks = tasks
        .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      targetIndex = targetColumnTasks.length; // place at bottom
    } else {
      // Dropped onto another task card
      const overTask = tasks.find((t) => t._id === overId);
      if (!overTask) return;

      targetColumnId = overTask.columnId;
      const targetColumnTasks = tasks
        .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const overIndex = targetColumnTasks.findIndex((t) => t._id === overId);
      targetIndex = overIndex >= 0 ? overIndex : targetColumnTasks.length;
    }

    // Filter tasks of the target column (excluding the active card)
    const columnTasks = tasks
      .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // 2. Calculate fractional orderIndex
    const newOrderIndex = calculateNewOrderIndex(columnTasks, targetIndex);

    // 3. Skip if nothing changed
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar onNewTask={() => setShowCreate(true)} />

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
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((col) => (
                <KanbanColumn key={col.id} id={col.id} tasks={col.tasks} />
              ))}
            </div>

            {/* Drag overlay preview for smooth dragging visual */}
            <DragOverlay>
              {activeTask ? (
                <div className="rotate-2 scale-105 shadow-xl opacity-90 pointer-events-none">
                  <TaskCard task={activeTask} />
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
