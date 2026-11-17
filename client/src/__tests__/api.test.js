import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getCourses, getPrograms, getSections, getTerms, getUser, login, register, toQuery } from '../api.js';

function mockFetch(status, body) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.login', () => {
  it('POSTs the credentials as JSON to /api/auth/login', async () => {
    const fetchMock = mockFetch(200, { token: 't', error: '' });

    const data = await login('ada', 'password123');

    expect(data.token).toBe('t');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ login: 'ada', password: 'password123' });
  });

  it('throws an ApiError with the server message on 401', async () => {
    mockFetch(401, { error: 'Login/Password incorrect' });

    await expect(login('ada', 'wrong')).rejects.toMatchObject({
      name: 'Error',
      status: 401,
      message: 'Login/Password incorrect',
    });
    await expect(login('ada', 'wrong')).rejects.toBeInstanceOf(ApiError);
  });

  it('gives a friendly message when rate limited (429)', async () => {
    mockFetch(429, 'Too many requests'); // express-rate-limit may not send JSON

    await expect(login('ada', 'x')).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/too many attempts/i),
    });
  });

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(login('ada', 'x')).rejects.toMatchObject({
      status: 0,
      message: expect.stringMatching(/cannot reach the server/i),
    });
  });
});

describe('api.register', () => {
  it('POSTs all fields to /api/auth/register', async () => {
    const fetchMock = mockFetch(201, { id: '1', message: 'User registered successfully', error: '' });
    const fields = { firstName: 'Ada', lastName: 'L', login: 'ada', password: 'password123', role: 'advisor' };

    await register(fields);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(JSON.parse(options.body)).toEqual(fields);
  });

  it('exposes field-level validation details', async () => {
    mockFetch(400, { error: 'Validation failed', details: { password: 'Password must be at least 8 characters' } });

    await expect(register({})).rejects.toMatchObject({
      status: 400,
      details: { password: 'Password must be at least 8 characters' },
    });
  });
});

describe('api.getUser', () => {
  it('GETs /api/users/:id with the Bearer token and no body', async () => {
    const fetchMock = mockFetch(200, { login: 'ada', role: 'student' });

    const user = await getUser('abc123', 'fake.jwt.token');

    expect(user.login).toBe('ada');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/users/abc123');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer fake.jwt.token');
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.body).toBeUndefined();
  });

  it('throws an ApiError with status 401 for an expired token', async () => {
    mockFetch(401, { error: 'Invalid or expired token' });

    await expect(getUser('abc123', 'old')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid or expired token',
    });
  });
});

describe('api.getPrograms', () => {
  const page = (items, total, n) => ({ ok: true, status: 200, json: async () => ({ items, total, page: n, limit: 100 }) });

  it('unwraps the paginated response into a flat array with the token attached', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page([{ _id: '1', name: 'CS' }], 1, 1));
    vi.stubGlobal('fetch', fetchMock);

    const programs = await getPrograms('jwt');

    expect(programs).toEqual([{ _id: '1', name: 'CS' }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/programs?page=1&limit=100');
    expect(options.headers.Authorization).toBe('Bearer jwt');
  });

  it('follows every page until all programs are loaded', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ _id: String(i) }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page(first, 101, 1))
      .mockResolvedValueOnce(page([{ _id: '100' }], 101, 2));
    vi.stubGlobal('fetch', fetchMock);

    const programs = await getPrograms('jwt');

    expect(programs).toHaveLength(101);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/programs?page=2&limit=100');
  });
});

describe('catalog requests', () => {
  it('toQuery skips empty values', () => {
    expect(toQuery({ q: 'cop', departmentId: '', page: 2, x: undefined, y: null })).toBe('?q=cop&page=2');
    expect(toQuery({})).toBe('');
  });

  it('getCourses and getSections send only the filters that are set', async () => {
    const fetchMock = mockFetch(200, { items: [], total: 0, page: 1, limit: 20 });

    await getCourses({ q: 'calc', departmentId: '', page: 1, limit: 20 }, 'jwt');
    await getSections({ termId: 't1', courseId: undefined, status: 'open', page: 1, limit: 25 }, 'jwt');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/courses?q=calc&page=1&limit=20');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/sections?termId=t1&status=open&page=1&limit=25');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt');
  });

  it('getTerms loads every page', async () => {
    const fetchMock = mockFetch(200, { items: [{ _id: 't1' }], total: 1, page: 1, limit: 100 });

    expect(await getTerms('jwt')).toEqual([{ _id: 't1' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/terms?page=1&limit=100');
  });
});
