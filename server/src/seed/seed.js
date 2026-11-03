import "dotenv/config";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Activity } from "../models/Activity.js";

const TASKS = [
  { title: "Add rate limiting to the API", description: "Use express-rate-limit.", priority: "High", columnId: "todo", tags: ["backend", "security"] },
  { title: "Write E2E tests for the board", description: "Cover drag-and-drop flows with Playwright.", priority: "Medium", columnId: "todo", tags: ["testing", "frontend"] },
  { title: "Design dark-mode colour tokens", description: "Audit WCAG AA contrast ratios.", priority: "Low", columnId: "todo", tags: ["design", "accessibility"] },
  { title: "Migrate task tags to normalised collection", description: "Enable tag aggregation.", priority: "Medium", columnId: "todo", tags: ["backend", "database"] },
  { title: "Add pagination to activity feed", description: "Cursor-based pagination using createdAt.", priority: "Low", columnId: "todo", tags: ["backend", "api"] },

  { title: "Implement drag-and-drop with @dnd-kit", description: "Integrate DndContext and SortableContext.", priority: "High", columnId: "in-progress", tags: ["frontend", "dnd"] },
  { title: "Connect move endpoint to Zustand store", description: "Optimistic update + rollback on 409.", priority: "High", columnId: "in-progress", tags: ["frontend", "state"] },
  { title: "Add MongoDB Atlas deployment config", description: "Set MONGODB_URI in production.", priority: "Medium", columnId: "in-progress", tags: ["devops"] },
  { title: "Build activity feed UI component", description: "Slide-out panel showing last 30 actions.", priority: "Medium", columnId: "in-progress", tags: ["frontend", "ui"] },
  { title: "Refactor error messages to be user-friendly", description: "Replace raw Zod paths.", priority: "Low", columnId: "in-progress", tags: ["frontend", "ux"] },
  { title: "Write unit tests for rebalance utility", description: "Cover threshold edge cases.", priority: "Medium", columnId: "in-progress", tags: ["testing", "backend"] },

  { title: "Scaffold MERN repo structure", description: "Created client/ and server/ structure.", priority: "Medium", columnId: "done", tags: ["setup"] },
  { title: "Implement GET /api/tasks", description: "Returns tasks sorted by columnId, orderIndex.", priority: "High", columnId: "done", tags: ["backend", "api"] },
  { title: "Set up Tailwind CSS v3 with dark mode", description: "darkMode: 'class', Inter font.", priority: "Low", columnId: "done", tags: ["frontend", "design"] },
  { title: "Add Zod validation middleware", description: ".strict() on update schema.", priority: "Medium", columnId: "done", tags: ["backend", "validation"] },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  await Promise.all([Task.deleteMany({}), Activity.deleteMany({})]);

  const columnCounters = { todo: 0, "in-progress": 0, done: 0 };
  const taskDocs = TASKS.map((t) => {
    columnCounters[t.columnId] += 1;
    return { ...t, orderIndex: columnCounters[t.columnId] * 1000, version: 0 };
  });

  const inserted = await Task.insertMany(taskDocs);
  const activities = inserted.map((task) => ({
    action: "created",
    taskId: task._id,
    taskTitle: task.title,
    message: `Created "${task.title}"`,
    createdAt: new Date(),
  }));

  await Activity.insertMany(activities);
  console.log(`✅ Seeded ${inserted.length} tasks and ${activities.length} activities`);
  await mongoose.disconnect();
}

seed().catch(console.error);