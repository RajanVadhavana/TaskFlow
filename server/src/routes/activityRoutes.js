import { Router } from "express";
import { getActivity } from "../controllers/activityController.js";

const router = Router();
router.get("/", getActivity);

export default router;