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

// Helper: return a Date that is `minutes` minutes ago
function minsAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

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

  // Map task titles to their inserted IDs for reference in activity entries.
  const byTitle = {};
  inserted.forEach((t) => { byTitle[t.title] = t; });

  // 8 curated sample activities with varied actions, columns, and staggered
  // timestamps so the activity drawer shows realistic grouping (today/yesterday).
  const activities = [
    {
      action: "created",
      taskId:    byTitle["Scaffold MERN repo structure"]._id,
      taskTitle: "Scaffold MERN repo structure",
      toColumn:  "done",
      message:   "Task 'Scaffold MERN repo structure' created by User",
      actor:     "User",
      createdAt: minsAgo(60 * 26), // ~26 hours ago → yesterday
    },
    {
      action: "created",
      taskId:    byTitle["Implement GET /api/tasks"]._id,
      taskTitle: "Implement GET /api/tasks",
      toColumn:  "todo",
      message:   "Task 'Implement GET /api/tasks' created by User",
      actor:     "User",
      createdAt: minsAgo(60 * 25),
    },
    {
      action: "moved",
      taskId:    byTitle["Implement GET /api/tasks"]._id,
      taskTitle: "Implement GET /api/tasks",
      fromColumn: "todo",
      toColumn:   "in-progress",
      message:   "Task 'Implement GET /api/tasks' moved from 'To Do' to 'In Progress' by User",
      actor:     "User",
      createdAt: minsAgo(60 * 24),
    },
    {
      action: "moved",
      taskId:    byTitle["Implement GET /api/tasks"]._id,
      taskTitle: "Implement GET /api/tasks",
      fromColumn: "in-progress",
      toColumn:   "done",
      message:   "Task 'Implement GET /api/tasks' moved from 'In Progress' to 'Done' by User",
      actor:     "User",
      createdAt: minsAgo(60 * 20),
    },
    {
      action: "created",
      taskId:    byTitle["Implement drag-and-drop with @dnd-kit"]._id,
      taskTitle: "Implement drag-and-drop with @dnd-kit",
      toColumn:  "in-progress",
      message:   "Task 'Implement drag-and-drop with @dnd-kit' created by User",
      actor:     "User",
      createdAt: minsAgo(60 * 4),
    },
    {
      action: "updated",
      taskId:    byTitle["Add rate limiting to the API"]._id,
      taskTitle: "Add rate limiting to the API",
      toColumn:  "todo",
      message:   "Task 'Add rate limiting to the API' updated by User",
      actor:     "User",
      createdAt: minsAgo(60 * 2),
    },
    {
      action: "reordered",
      taskId:    byTitle["Write E2E tests for the board"]._id,
      taskTitle: "Write E2E tests for the board",
      toColumn:  "todo",
      message:   "Task 'Write E2E tests for the board' reordered in 'To Do' by User",
      actor:     "User",
      createdAt: minsAgo(45),
    },
    {
      action: "deleted",
      taskId:    new mongoose.Types.ObjectId(), // task no longer exists
      taskTitle: "Spike: evaluate WebSockets for live updates",
      toColumn:  "todo",
      message:   "Task 'Spike: evaluate WebSockets for live updates' deleted by User",
      actor:     "User",
      createdAt: minsAgo(10),
    },
  ];

  await Activity.insertMany(activities);
  console.log(`✅ Seeded ${inserted.length} tasks and ${activities.length} activities`);
  await mongoose.disconnect();
}

seed().catch(console.error);
