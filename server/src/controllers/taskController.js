import mongoose from "mongoose";
import { getBottomIndex, maybeRebalance } from "../utils/rebalance.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../services/activityService.js";

export function validateId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid task id — must be a 24-char hex string." });
  }
  next();
}

export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find().sort({ columnId: 1, orderIndex: 1 }).lean();
  res.json({ tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, columnId, tags } = req.body;
  const last = await Task.findOne({ columnId }).sort({ orderIndex: -1 }).select("orderIndex").lean();
  const orderIndex = last ? last.orderIndex + 1000 : 1000;

  const task = await Task.create({ title, description, priority, columnId, orderIndex, tags });

  // Log AFTER create succeeds — a logging error must not roll back the task.
  await logActivity({ action: "created", task });

  res.status(201).json({ task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const { title, description, priority, tags } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (tags !== undefined) task.tags = tags;

  task.version += 1;
  await task.save();

  await logActivity({ action: "updated", task });

  res.json({ task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  // Read before deleting so we have the title for the activity message.
  const task = await Task.findByIdAndDelete(req.params.id).lean();
  if (!task) return res.status(404).json({ error: "Task not found." });

  await logActivity({ action: "deleted", task });

  res.status(204).end();
});

// PATCH /api/tasks/:id/move
export const moveTask = asyncHandler(async (req, res) => {
  const { columnId, orderIndex, version } = req.body;
  const { id } = req.params;

  // Read the old column BEFORE the update so we can decide "moved" vs "reordered".
  // We only need columnId from the existing doc; use lean() to avoid fetching all fields.
  const existing = await Task.findById(id).select("columnId").lean();
  if (!existing) {
    return res.status(404).json({ error: "Task not found." });
  }
  const fromColumn = existing.columnId;

  // Atomic optimistic concurrency check
  const updated = await Task.findOneAndUpdate(
    { _id: id, version },
    { $set: { columnId, orderIndex }, $inc: { version: 1 } },
    { new: true }
  );

  if (!updated) {
    // version mismatch — task exists but was modified concurrently
    const current = await Task.findById(id).lean();
    return res.status(409).json({
      code: "STALE_VERSION",
      error: "Task was modified by another request. Refresh and retry.",
      task: current,
    });
  }

  // Same column = reorder; different column = move.
  const isSameColumn = fromColumn === columnId;
  await logActivity({
    action:     isSameColumn ? "reordered" : "moved",
    task:       updated,
    fromColumn: fromColumn,
    toColumn:   columnId,
  });

  const rebalanceResult = await maybeRebalance(columnId);
  res.json({ task: updated, ...rebalanceResult });
});
