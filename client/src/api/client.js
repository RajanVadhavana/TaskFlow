const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = res.status;
    error.code = data.code;
    error.serverTask = data.task;
    throw error;
  }
  return data;
}

export const taskApi = {
  getAll: () => request("/tasks"),
  create: (body) => request("/tasks", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  move: (id, body) => request(`/tasks/${id}/move`, { method: "PATCH", body: JSON.stringify(body) }),
};