import React, { useState, useCallback, useRef } from "react";
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
import { AlertCircle, RefreshCw } from "lucide-react";
import { useColumns } from "../hooks/useColumns.js";
import { useBoardStore, getAllTasks } from "../store/useBoardStore.js";
import { useActivity } from "../hooks/useActivity.js";
import { COLUMN_ORDER, COLUMN_LABELS } from "../utils/constants.js";
import { computeOrderIndex } from "../utils/order.js";
import Navbar from "../components/Navbar.jsx";
import KanbanColumn from "../components/KanbanColumn.jsx";
import TaskCard from "../components/TaskCard.jsx";
import TaskModal from "../components/TaskModal.jsx";
import ActivityDrawer from "../components/ActivityDrawer.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import Button from "../components/ui/Button.jsx";

/**
 * Decide above-or-below by comparing the DragOverlay's translated center Y
 * against the over-item's vertical midpoint.
 */
function shouldInsertBefore(activeRect, overRect) {
  if (!activeRect || !overRect) return true;
  const overlayCenterY = activeRect.top + activeRect.height / 2;
  const overMidY = overRect.top + overRect.height / 2;
  return overlayCenterY < overMidY;
}

/**
 * SkeletonBoard — shown while initial tasks fetch is in progress.
 * Mirrors the 3-column layout with pulsing placeholders.
 */
function SkeletonBoard() {
  return (
    <div
      aria-label="Loading board"
      aria-busy="true"
      className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:pb-0"
    >
      {[1, 2, 3].map((colIndex) => (
        <div
          key={colIndex}
          className="snap-center shrink-0 w-[85vw] md:w-auto bg-slate-100/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-3 min-h-[360px]"
        >
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5 mt-1">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2">
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2">
              <Skeleton className="h-3.5 w-14 rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * BoardPage
 *
 * Main page assembling the Kanban board:
 * - 3 equal columns on desktop, horizontal scroll-snap on mobile (< 768px)
 * - Skeleton loading state and error banner with retry
 * - Drag and Drop wired via @dnd-kit
 * - Activity drawer wired to Bell button in Navbar
 * - ARIA live region announces card moves to screen readers
 */
export default function BoardPage() {
  const { columns, loading, error, refetch } = useColumns();
  const tasks = useBoardStore(getAllTasks);
  const moveTask = useBoardStore((s) => s.moveTask);

  const [showCreate, setShowCreate] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Live region message announced to screen readers after drag-drop moves.
  const [announcement, setAnnouncement] = useState("");
  // Ref to the "New Task" button so focus can return to it after closing the modal.
  const newTaskBtnRef = useRef(null);

  // ── Activity drawer state ─────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    activities,
    nextCursor,
    loading: activityLoading,
    error: activityError,
    hasUnread,
    fetchActivity,
    loadMore,
    markSeen,
    notifyUnread,
  } = useActivity();

  const handleOpenActivity = useCallback(() => {
    setDrawerOpen(true);
    markSeen();
    fetchActivity();
  }, [markSeen, fetchActivity]);

  /**
   * afterMutation — called after every successful create/update/delete/move.
   * Refreshes the activity feed or lights up the unread dot.
   */
  const afterMutation = useCallback(() => {
    if (drawerOpen) {
      fetchActivity();
    } else {
      notifyUnread();
    }
  }, [drawerOpen, fetchActivity, notifyUnread]);

  // ── DnD kit sensors ───────────────────────────────────────────────────────
  // Require moving 8px before activating drag so normal clicks aren't intercepted.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function collisionDetection(args) {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }

  function handleDragStart(event) {
    const task = tasks.find((t) => t._id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const currentTask = tasks.find((t) => t._id === activeId);
    if (!currentTask) return;

    let targetColumnId;
    let targetIndex;
    const isOverColumn = COLUMN_ORDER.includes(overId);

    if (isOverColumn) {
      targetColumnId = overId;
      const targetColumnTasks = tasks
        .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      targetIndex = targetColumnTasks.length;
    } else {
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
        const insertBefore = shouldInsertBefore(active.rect.current.translated, over.rect);
        targetIndex = insertBefore ? overIndex : overIndex + 1;
      }
    }

    const columnTasks = tasks
      .filter((t) => t.columnId === targetColumnId && t._id !== activeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const newOrderIndex = computeOrderIndex(columnTasks, targetIndex);

    if (
      currentTask.columnId === targetColumnId &&
      Math.abs(currentTask.orderIndex - newOrderIndex) < 0.0001
    ) {
      return;
    }

    // Announce the move to screen readers via the ARIA live region.
    const toLabel = COLUMN_LABELS[targetColumnId] ?? targetColumnId;
    setAnnouncement(`Moved "${currentTask.title}" to ${toLabel}`);
    // Clear after a moment so the same message can be re-announced if needed.
    setTimeout(() => setAnnouncement(""), 2000);

    await moveTask(activeId, targetColumnId, newOrderIndex);
    afterMutation();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-bg)]">
      {/*
        ARIA live region — hidden visually but read aloud by screen readers
        after every drag-drop card move. aria-live="assertive" interrupts
        the reader immediately (appropriate since the user just performed an action).
      */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <Navbar
        onNewTask={() => setShowCreate(true)}
        newTaskBtnRef={newTaskBtnRef}
        onActivity={handleOpenActivity}
        hasUnread={hasUnread}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Title row */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag cards between columns to update their status.
          </p>
        </div>

        {/* Error banner with Retry */}
        {error && !loading && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
              <AlertCircle size={20} className="shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium">Failed to load tasks</p>
                <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={refetch}
              className="shrink-0 text-xs"
            >
              <RefreshCw size={13} className="mr-1.5" aria-hidden />
              Retry
            </Button>
          </div>
        )}

        {/* Skeleton loading state */}
        {loading && <SkeletonBoard />}

        {/* Kanban Board with DnD */}
        {!loading && !error && (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Desktop: 3 equal columns | Below 768px: horizontal scroll-snap ~85vw */}
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
              {columns.map((col) => (
                <div key={col.id} className="snap-center shrink-0 w-[85vw] md:w-auto">
                  <KanbanColumn
                    id={col.id}
                    tasks={col.tasks}
                    onMutation={afterMutation}
                  />
                </div>
              ))}
            </div>

            {/* Drag overlay: no transforms to prevent visual mismatch */}
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

      {/* Task modal for creation — returns focus to New Task button on close */}
      {showCreate && (
        <TaskModal
          onClose={() => {
            setShowCreate(false);
            // Return focus to the button that opened the modal (WCAG 2.4.3)
            setTimeout(() => newTaskBtnRef.current?.focus(), 0);
          }}
          onSuccess={afterMutation}
        />
      )}

      {/* Activity drawer — portal rendered, always mounted for slide animation */}
      <ActivityDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activities={activities}
        nextCursor={nextCursor}
        loading={activityLoading}
        error={activityError}
        onLoadMore={loadMore}
        onRetry={fetchActivity}
      />
    </div>
  );
}
