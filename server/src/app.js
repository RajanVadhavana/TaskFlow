import express from "express";
import cors from "cors";
import morgan from "morgan";
import taskRoutes from "./routes/taskRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Chaos simulation middleware for DevTools — responds with 500 when client requests failure
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

// 404 catch-all — must come after all routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — catches anything thrown by asyncHandler or next(err)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server error]", err);
  res.status(500).json({ error: "Unexpected server error" });
});

export default app;
