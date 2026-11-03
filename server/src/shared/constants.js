export const COLUMNS = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  DONE: "done",
};

export const COLUMN_IDS = Object.values(COLUMNS);

export const COLUMN_LABELS = {
  [COLUMNS.TODO]: "To Do",
  [COLUMNS.IN_PROGRESS]: "In Progress",
  [COLUMNS.DONE]: "Done",
};

export const COLUMN_ORDER = [COLUMNS.TODO, COLUMNS.IN_PROGRESS, COLUMNS.DONE];
export const PRIORITIES = ["Low", "Medium", "High"];
export const ORDER_GAP = 1000;
export const REBALANCE_THRESHOLD = 0.001;