// isDev: only log verbose error details in development, not in production,
// so stack traces and internal state are never exposed to log aggregators.
const isDev = process.env.NODE_ENV !== "production";

export function errorHandler(err, req, res, next) {
  if (isDev) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  // Mongoose validation failure → 400
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ error: message });
  }

  // Mongo duplicate-key → 409
  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate value — document already exists." });
  }

  // Use the status the thrower set, or fall back to 500.
  const status = err.status || err.statusCode || 500;

  // Hide internal error messages in production to avoid leaking implementation details.
  const message =
    status < 500 || isDev
      ? err.message || "An error occurred"
      : "Internal server error";

  res.status(status).json({ error: message });
}
