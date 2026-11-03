import { Router } from "express";
import { validate, createTaskSchema, updateTaskSchema } from "../middleware/validate.js";
import { getTasks, createTask, updateTask, deleteTask, validateId } from "../controllers/taskController.js";

const router = Router();

router.get("/", getTasks);
router.post("/", validate(createTaskSchema), createTask);
router.patch("/:id", validateId, validate(updateTaskSchema), updateTask);
router.delete("/:id", validateId, deleteTask);

export default router;