import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  // GET /api/programs does not exist on the backend yet
  getPrograms: vi.fn().mockRejectedValue(Object.assign(new Error('Route not found'), { status: 404 })),
  updateDeclarations: vi.fn(),
}));

// Shape of GET /api/users/:id (password is stripped by the backend)
const USER = {
  _id: 'abc123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  login: 'ada',
  email: 'ada@example.com',
  role: 'student',
  declarations: [
    { programId: '65a000000000000000000001', catalogYear: 2025, declaredAt: '2026-01-15T00:00:00.000Z' },
    { programId: '65a000000000000000000002', catalogYear: 2024, declaredAt: '2026-02-20T00:00:00.000Z' },
  ],
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
};

function renderHome(role = 'student') {
  localStorage.setItem('auth', JSON.stringify({ ...SESSION, role }));
  return renderApp('/home');
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getUser.mockResolvedValue(USER);
});

describe('Student home page', () => {
  it('greets the student immediately from the login session', () => {
    api.getUser.mockReturnValue(new Promise(() => {})); // never resolves
    renderHome();

    expect(screen.getByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your profile/i);
  });

  it('requests the profile with the user id and token', async () => {
    renderHome();

    await screen.findByRole('heading', { name: 'My Profile' });
    expect(api.getUser).toHaveBeenCalledWith('abc123', 'fake.jwt.token');
  });

  it('shows the profile details', async () => {
    renderHome();

    const profile = (await screen.findByRole('heading', { name: 'My Profile' })).closest('section');
    expect(profile).toHaveTextContent('Ada Lovelace');
    expect(profile).toHaveTextContent('ada@example.com');
    expect(profile).toHaveTextContent('Student'); // role is capitalized for display
    expect(profile).toHaveTextContent('ada'); // login
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows "Not provided" when the student has no email', async () => {
    api.getUser.mockResolvedValue({ ...USER, email: undefined });
    renderHome();

    const profile = (await screen.findByRole('heading', { name: 'My Profile' })).closest('section');
    expect(profile).toHaveTextContent('Not provided');
  });

  it('lists each declared program with its catalog year', async () => {
    renderHome();

    const card = (await screen.findByRole('heading', { name: 'Declared Programs' })).closest('section');
    expect(card.querySelectorAll('li')).toHaveLength(2);
    expect(card).toHaveTextContent('Catalog 2025');
    expect(card).toHaveTextContent('Catalog 2024');
  });

  it('shows a message when no programs are declared', async () => {
    api.getUser.mockResolvedValue({ ...USER, declarations: [] });
    renderHome();

    expect(await screen.findByText(/have not declared a major or minor/i)).toBeInTheDocument();
  });

  it('shows placeholders for sections that need endpoints that do not exist yet', async () => {
    renderHome();

    await screen.findByRole('heading', { name: 'My Profile' });
    for (const title of ['My Schedule', 'Waitlists', 'Degree Progress', 'Registration Dates']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/waiting on backend/i)).toHaveLength(4);
  });

  it('shows an error with a retry button, and retry reloads the profile', async () => {
    api.getUser.mockRejectedValueOnce(new Error('Cannot reach the server. Please try again.'));
    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(api.getUser).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('logs the user out and returns to login when the token is rejected (401)', async () => {
    api.getUser.mockRejectedValue(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
    renderHome();

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('logs out from the top bar', async () => {
    renderHome();
    await screen.findByRole('heading', { name: 'My Profile' });

    await userEvent.click(screen.getByRole('button', { name: 'Log Out' }));

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });
});

describe('Home page for other roles', () => {
  it.each(['advisor', 'instructor', 'admin'])('%s sees a placeholder and no profile request', async (role) => {
    renderHome(role);

    expect(screen.getByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${role} home page is coming soon`, 'i'))).toBeInTheDocument();
    await waitFor(() => expect(api.getUser).not.toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'My Profile' })).not.toBeInTheDocument();
  });
});
