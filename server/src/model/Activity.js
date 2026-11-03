import mongoose from "mongoose";
import { COLUMN_IDS } from "../shared/constants.js";

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["created", "updated", "deleted", "moved", "reordered"],
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    taskTitle: {
      type: String,
      required: true,
    },
    fromColumn: {
      type: String,
      enum: COLUMN_IDS,
    },
    toColumn: {
      type: String,
      enum: COLUMN_IDS,
    },
    actor: {
      type: String,
      default: "User",
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);