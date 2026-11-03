import React from "react";
import TaskModal from "./TaskModal.jsx";

export default function CreateTaskModal({ onClose, defaultColumnId }) {
  return <TaskModal defaultColumnId={defaultColumnId} onClose={onClose} />;
}
