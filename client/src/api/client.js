// Base URL comes from .env so we can point at staging/production without
// changing code. Falls back to localhost for convenience during development.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Thin wrapper around fetch that:
 *  - Sets Content-Type to JSON for non-GET requests.
 *  - Throws a plain Error with the server's `error` field as the message.
 *  - Returns parsed JSON on success.
 */
async function request(method, path, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, options);

  // 204 No Content (DELETE) has no body — return null.
  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    err.code = data.code;    // e.g. "STALE_VERSION"
    err.serverTask = data.task; // latest task state sent back on 409
    throw err;
  }

  return data;
}

// ── Task API ───────────────────────────────────────────────────────────────────

export const taskApi = {
  getAll: () => request("GET", "/tasks"),

  create: (payload) => request("POST", "/tasks", payload),

  update: (id, payload) => request("PATCH", `/tasks/${id}`, payload),

  remove: (id) => request("DELETE", `/tasks/${id}`),

  move: (id, payload) => request("PATCH", `/tasks/${id}/move`, payload),
};

// ── Activity API ───────────────────────────────────────────────────────────────

export const activityApi = {
  get: (limit = 30, before = null) => {
    const params = new URLSearchParams({ limit });
    if (before) params.set("before", before);
    return request("GET", `/activity?${params}`);
  },
};
