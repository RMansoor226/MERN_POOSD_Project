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

// --- Catalog (any logged-in user can read) ----------------------------------
// List endpoints are paginated: { items, total, page, limit } with limit max 100.

// "?a=1&b=x", skipping empty values so the backend only sees filters that are set
export function toQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// Walks every page of a list endpoint and resolves to one flat array.
async function getAll(path, params, token) {
  const limit = 100;
  const all = [];
  for (let page = 1; ; page += 1) {
    const data = await request(`${path}${toQuery({ ...params, page, limit })}`, { token });
    const items = data.items ?? [];
    all.push(...items);
    if (items.length < limit || all.length >= data.total) return all;
  }
}

// GET /api/programs (all pages) -> [{ _id, name, type, degree, catalogYear, totalCredits, requirements, ... }]
export const getPrograms = (token) => getAll('/programs', {}, token);

// GET /api/programs/:id -> program. requirements[].courseIds are bare course ids and
// departmentId is a bare id (not populated).
export const getProgram = (id, token) => request(`/programs/${id}`, { token });

// GET /api/departments (all pages) -> [{ _id, code, name }]
export const getDepartments = (token) => getAll('/departments', {}, token);

// GET /api/terms (all pages, newest startDate first)
// -> [{ _id, name, year, season, startDate, endDate, registrationOpens, registrationCloses }]
export const getTerms = (token) => getAll('/terms', {}, token);

// GET /api/courses?page=&limit=&q=&departmentId=&subject=&attribute= -> one page.
// q matches code or title. Each course has departmentId populated as { _id, code, name }.
export const getCourses = (params, token) => request(`/courses${toQuery(params)}`, { token });

// GET /api/courses/:id -> course (prereqs/coreqs hold raw course ids)
export const getCourse = (id, token) => request(`/courses/${id}`, { token });

// GET /api/sections?page=&limit=&termId=&courseId=&instructorId=&status=&modality= -> one page.
// courseId -> { code, title, credits }, termId -> { name }, instructorIds -> [{ firstName, lastName, title }]
export const getSections = (params, token) => request(`/sections${toQuery(params)}`, { token });

// Every section matching the filters (all pages).
export const getAllSections = (params, token) => getAll('/sections', params, token);

// Every course matching the filters (all pages).
export const getAllCourses = (params, token) => getAll('/courses', params, token);

// --- Admin: generic CRUD (reads: any logged-in user; writes: admin only) ---------
// path is the collection path, e.g. '/departments'. Deletes that other records depend on
// fail with 409 and a message such as "Term still has sections".

export const listResource = (path, params, token) => request(`${path}${toQuery(params)}`, { token });
export const getAllResource = (path, token) => getAll(path, {}, token);
export const getResource = (path, id, token) => request(`${path}/${id}`, { token });
export const createResource = (path, body, token) => request(path, { method: 'POST', body, token });
export const updateResource = (path, id, body, token) =>
  request(`${path}/${id}`, { method: 'PATCH', body, token });
export const deleteResource = (path, id, token) => request(`${path}/${id}`, { method: 'DELETE', token });

// GET /api/users (admin only) -> plain array, not paginated
export const listUsers = (token) => request('/users', { token });
