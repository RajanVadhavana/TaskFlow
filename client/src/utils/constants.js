// Column IDs and labels — mirrors server/src/shared/constants.js exactly.
export const COLUMNS = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  DONE: "done",
};

export const COLUMN_LABELS = {
  [COLUMNS.TODO]: "To Do",
  [COLUMNS.IN_PROGRESS]: "In Progress",
  [COLUMNS.DONE]: "Done",
};

export const COLUMN_ORDER = [COLUMNS.TODO, COLUMNS.IN_PROGRESS, COLUMNS.DONE];
export const PRIORITIES = ["Low", "Medium", "High"];

export const PRIORITY_COLORS = {
  Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  High: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
};

export const ORDER_GAP = 1000;