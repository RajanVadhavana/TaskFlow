export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ error: message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate value — document already exists." });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status < 500 || process.env.NODE_ENV === "development"
      ? err.message || "An error occurred"
      : "Internal server error";

  res.status(status).json({ error: message });
}