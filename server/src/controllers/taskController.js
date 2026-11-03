import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  res.json({ task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id).lean();
  if (!task) return res.status(404).json({ error: "Task not found." });
  res.status(204).end();
});