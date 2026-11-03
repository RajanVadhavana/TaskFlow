import { Router } from "express";
import { moveTaskSchema } from "../middleware/validate.js";
import { moveTask } from "../controllers/taskController.js";
import { validate, createTaskSchema, updateTaskSchema } from "../middleware/validate.js";
import { getTasks, createTask, updateTask, deleteTask, validateId } from "../controllers/taskController.js";

const router = Router();

router.get("/", getTasks);
router.post("/", validate(createTaskSchema), createTask);
router.patch("/:id", validateId, validate(updateTaskSchema), updateTask);
router.delete("/:id", validateId, deleteTask);
router.patch("/:id/move", validateId, validate(moveTaskSchema), moveTask);

export default router;