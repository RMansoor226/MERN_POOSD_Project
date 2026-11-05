import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn().mockResolvedValue({ login: 'ada', role: 'student', declarations: [] }),
  getPrograms: vi.fn().mockRejectedValue(Object.assign(new Error('Route not found'), { status: 404 })),
}));

describe('route guards', () => {
  it('redirects a logged-out user from /home to the login page', () => {
    renderApp('/home');

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('redirects unknown URLs to the login page', () => {
    renderApp('/does-not-exist');

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('sends a logged-in user from / and /register to /home', async () => {
    localStorage.setItem('auth', JSON.stringify(SESSION));

    const { unmount } = renderApp('/');
    expect(screen.getByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'My Profile' }); // let the profile request finish
    unmount();

    renderApp('/register');
    expect(screen.getByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'My Profile' });
  });

  it('shows the role on the home page and logs out back to login', async () => {
    localStorage.setItem('auth', JSON.stringify(SESSION));
    renderApp('/home');
    await screen.findByRole('heading', { name: 'My Profile' });

    expect(within(screen.getByRole('banner')).getByText('student')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Log Out' }));

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('ignores a corrupted saved session', () => {
    localStorage.setItem('auth', '{not valid json');
    renderApp('/home');

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });
});
