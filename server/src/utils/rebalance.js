import { Task } from "../models/Task.js";

const ORDER_GAP = 1000;
const REBALANCE_THRESHOLD = 0.001;

export async function getBottomIndex(columnId) {
  const last = await Task.findOne({ columnId })
    .sort({ orderIndex: -1 })
    .select("orderIndex")
    .lean();

  return last ? last.orderIndex + ORDER_GAP : ORDER_GAP;
}

export async function maybeRebalance(columnId) {
  const tasks = await Task.find({ columnId })
    .sort({ orderIndex: 1 })
    .select("_id orderIndex")
    .lean();

  let tooClose = false;
  for (let i = 1; i < tasks.length; i++) {
    if (tasks[i].orderIndex - tasks[i - 1].orderIndex < REBALANCE_THRESHOLD) {
      tooClose = true;
      break;
    }
  }

  if (!tooClose) {
    return { rebalanced: false };
  }

  const ops = tasks.map((task, i) => ({
    updateOne: {
      filter: { _id: task._id },
      update: {
        $set: { orderIndex: (i + 1) * ORDER_GAP },
        $inc: { version: 1 },
      },
    },
  }));

  await Task.bulkWrite(ops, { ordered: false });

  const rebalancedTasks = await Task.find({ columnId })
    .sort({ orderIndex: 1 })
    .lean();

  return { rebalanced: true, tasks: rebalancedTasks };
}