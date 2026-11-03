import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 8000;

async function start() {
  await connectDB();

  // Capture the http.Server instance so we can close it cleanly on shutdown.
  const httpServer = app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  // On SIGTERM (Docker/cloud stop) or SIGINT (Ctrl-C in dev), stop accepting
  // new connections, wait for in-flight requests to finish, then close Mongo.
  // Without this, a cloud platform can interrupt mid-request and leave the DB
  // in an inconsistent state.
  function shutdown(signal) {
    console.log(`\n[server] Received ${signal}. Shutting down gracefully…`);

    httpServer.close(async () => {
      console.log("[server] HTTP server closed.");
      try {
        await mongoose.disconnect();
        console.log("[server] MongoDB disconnected. Goodbye.");
      } catch (err) {
        console.error("[server] Error during Mongo disconnect:", err.message);
      }
      process.exit(0);
    });

    // Hard-kill after 10 s if requests don't finish in time.
    setTimeout(() => {
      console.error("[server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("[server] Failed to start:", err.message);
  process.exit(1);
});
