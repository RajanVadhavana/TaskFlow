import React from "react";
import TaskModal from "./TaskModal.jsx";

export default function EditTaskModal({ task, onClose }) {
  return <TaskModal task={task} onClose={onClose} />;
}
