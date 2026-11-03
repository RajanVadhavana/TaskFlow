// Base URL comes from .env so we can point at staging/production without
// changing code. Falls back to localhost for convenience during development.
const BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:8000/api";

/**
 * Custom ApiError class holding status code, server error code,
 * message, and any server task payload (e.g. on 409 STALE_VERSION).
 */
export class ApiError extends Error {
  constructor(status, code, message, serverTask = null) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.serverTask = serverTask;
  }
}

/**
 * simulation — toggled by the DevTools chaos panel.
 *
 * Exported as a mutable plain object so the chaos panel can flip its fields
 * in place (e.g. simulation.failure = true) without a setter or re-render.
 *
 *   failure  : boolean  – simulate 500 failure on mutations to test rollback
 *   latencyMs: number   – add artificial delay before the request fires
 */
export const simulation = {
  failure: false,
  latencyMs: 0,
};

/**
 * Thin wrapper around fetch that:
 *  - Sets Content-Type to JSON for non-GET requests.
 *  - Attaches simulation headers when chaos mode is active.
 *  - Throws an ApiError {status, code, message} for non-2xx responses.
 *  - Returns parsed JSON on success.
 */
async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };

  // Chaos headers — DevTools toggles these via the simulation object.
  if (simulation.failure) headers["X-Simulate-Failure"] = "true";
  if (simulation.latencyMs > 0) {
    headers["X-Simulate-Latency"] = String(simulation.latencyMs);
    // Also delay client-side so spinners are visible even without server support.
    await new Promise((r) => setTimeout(r, simulation.latencyMs));
  }

  // If simulation failure is enabled, simulate a 500 server error on mutations
  // (e.g. moving a card) so the UI optimistic rollback triggers deterministically.
  if (simulation.failure && method !== "GET") {
    throw new ApiError(500, "SIMULATED_FAILURE", "Simulated 500 server failure");
  }

  const options = { method, headers };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, options);

  // 204 No Content (DELETE) has no body — return null.
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.code, data.error, data.task);
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
