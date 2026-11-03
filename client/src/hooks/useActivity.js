import { useState, useCallback } from "react";
import { activityApi } from "../api/client.js";

/**
 * useActivity — state and actions for the activity drawer.
 *
 * Kept as a plain hook (not a Zustand store) because activity state is
 * ephemeral UI state: it only matters while the drawer is open, and we
 * always re-fetch on open. No need to persist across re-mounts.
 *
 * State:
 *   activities : Activity[]
 *   nextCursor : string | null  – ISO date; null when no more pages
 *   loading    : boolean
 *   error      : string | null
 *   hasUnread  : boolean  – true when a mutation fires while the drawer is closed
 */
export function useActivity() {
  const [activities, setActivities] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  /**
   * fetchActivity — (re)load from the top.
   * Called on drawer open. reset=true clears the existing list.
   */
  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityApi.get(30, null);
      setActivities(data.activities);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * loadMore — append the next page using nextCursor.
   * The "Load more" button calls this; it's a no-op when nextCursor is null.
   */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const data = await activityApi.get(30, nextCursor);
      setActivities((prev) => [...prev, ...data.activities]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err.message || "Failed to load more activity");
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  /**
   * markSeen — called when the drawer opens to clear the unread dot.
   */
  const markSeen = useCallback(() => {
    setHasUnread(false);
  }, []);

  /**
   * notifyUnread — called after a successful mutation when the drawer is closed.
   * Shows the dot on the Bell button so the user knows something happened.
   */
  const notifyUnread = useCallback(() => {
    setHasUnread(true);
  }, []);

  return { activities, nextCursor, loading, error, hasUnread, fetchActivity, loadMore, markSeen, notifyUnread };
}

