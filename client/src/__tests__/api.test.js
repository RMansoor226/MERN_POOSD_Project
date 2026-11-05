import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getUser, login, register } from '../api.js';

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
