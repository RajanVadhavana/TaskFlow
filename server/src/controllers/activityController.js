import { Activity } from "../models/Activity.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const filter = {};

  if (req.query.before) {
    filter.createdAt = { $lt: new Date(req.query.before) };
  }

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const nextCursor = activities.length === limit ? activities[activities.length - 1].createdAt.toISOString() : null;
  res.json({ activities, nextCursor });
});