// Thin wrapper around fetch for the backend API.
// Errors from the backend look like { error: "message", details?: { field: "message" } }.

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please try again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError(429, 'Too many attempts. Please wait a few minutes and try again.');
    }
    throw new ApiError(res.status, data.error || 'Something went wrong.', data.details);
  }
  return data;
}

export const login = (login, password) =>
  request('/auth/login', { method: 'POST', body: { login, password } });

export const register = (fields) =>
  request('/auth/register', { method: 'POST', body: fields });

// --- Authenticated routes (send the JWT as a Bearer token) -----------------

// GET /api/users/:id (self or admin) -> user document without the password
export const getUser = (id, token) => request(`/users/${id}`, { token });

// PATCH /api/users/:id (self or admin) -> updated user.
// The backend REPLACES the whole declarations array, so always send the full list.
export const updateDeclarations = (id, declarations, token) =>
  request(`/users/${id}`, { method: 'PATCH', body: { declarations }, token });

// PATCH /api/users/:id (self or admin) -> updated user.
// Accepts any of { firstName, lastName, email }. Sending email: '' removes the email.
export const updateProfile = (id, fields, token) =>
  request(`/users/${id}`, { method: 'PATCH', body: fields, token });

// GET /api/programs -> array of programs ({ _id, name, type, degree, catalogYear, ... }).
// NOTE: this endpoint does not exist on the backend yet; callers must handle the failure.
export const getPrograms = (token) => request('/programs', { token });
