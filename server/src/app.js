import express from "express";
import cors from "cors";
import morgan from "morgan";
import taskRoutes from "./routes/taskRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Log requests in development only — morgan adds noise in production logs
// and can expose internal path/query info to log aggregators unnecessarily.
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Chaos simulation middleware for DevTools panel — responds with 500 when the
// client sends X-Simulate-Failure so we can test optimistic-rollback behaviour
// without actually failing the database operation.
app.use((req, res, next) => {
  if (req.headers["x-simulate-failure"] === "true") {
    return res.status(500).json({
      error: "Simulated 500 server failure (DevTools)",
      code: "SIMULATED_FAILURE",
    });
  }
  next();
});

app.use("/api/tasks", taskRoutes);
app.use("/api/activity", activityRoutes);

// 404 and global error handler must come after all routes.
// Using the shared middleware so ValidationError, duplicate-key, etc.
// all produce correct status codes in one place.
app.use(notFound);
app.use(errorHandler);

export default app;
