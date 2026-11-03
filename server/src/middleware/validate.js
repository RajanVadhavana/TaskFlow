import { z } from "zod";
import { COLUMN_IDS, PRIORITIES } from "../shared/constants.js";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  priority: z.enum(PRIORITIES).optional().default("Medium"),
  columnId: z.enum(COLUMN_IDS).optional().default("todo"),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  tags: z.array(z.string().trim()).optional(),
}).strict(); // <-- Rejects unknown fields like orderIndex to prevent position tampering

export const moveTaskSchema = z.object({
  columnId: z.enum(COLUMN_IDS),
  orderIndex: z.number().finite("orderIndex must be a finite number"),
  version: z.number().int("version must be an integer").min(0),
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      const message = `${firstError.path.join(".")}: ${firstError.message}`;
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}