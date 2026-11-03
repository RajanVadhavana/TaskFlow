export function notFound(req, res) {
  res.status(404).json({ error: `${req.method} ${req.path} not found` });
}