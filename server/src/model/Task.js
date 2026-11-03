import mongoose from "mongoose";
import { COLUMN_IDS, PRIORITIES } from "../shared/constants.js";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITIES,
        message: "Priority must be Low, Medium, or High",
      },
      default: "Medium",
    },
    columnId: {
      type: String,
      enum: {
        values: COLUMN_IDS,
        message: "Invalid columnId",
      },
      required: true,
      default: "todo",
    },
    orderIndex: {
      type: Number,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for instant sorted queries without in-memory sort scans
taskSchema.index({ columnId: 1, orderIndex: 1 });

export const Task = mongoose.model("Task", taskSchema);