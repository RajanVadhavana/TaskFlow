import { Activity } from "../models/Activity.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getActivity = asyncHandler(async (req, res) => {
  // Validate limit: must be an integer between 1 and 100.
  // We reject invalid values with 400 rather than silently clamping, so the
  // client knows when it has sent a bad request.
  const rawLimit = parseInt(req.query.limit, 10);
  if (!req.query.limit) {
    // Default when not supplied
    var limit = 30;
  } else if (isNaN(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
  } else {
    var limit = rawLimit;
  }

  const filter = {};

  // Cursor pagination: "before" is an ISO date string from the previous page's
  // nextCursor. We fetch docs older than that timestamp.
  if (req.query.before) {
    const beforeDate = new Date(req.query.before);
    if (isNaN(beforeDate.getTime())) {
      return res.status(400).json({ error: "before must be a valid ISO date string" });
    }
    filter.createdAt = { $lt: beforeDate };
  }

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Return a cursor only when there may be more pages; null signals end of feed.
  const nextCursor =
    activities.length === limit
      ? activities[activities.length - 1].createdAt.toISOString()
      : null;

  res.json({ activities, nextCursor });
});
