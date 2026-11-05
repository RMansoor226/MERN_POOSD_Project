import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn().mockResolvedValue({ login: 'ada', role: 'student', declarations: [] }),
  getPrograms: vi.fn().mockRejectedValue(Object.assign(new Error('Route not found'), { status: 404 })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login page', () => {
  it('is the default page at "/"', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('links to the register page', async () => {
    renderApp('/');

    await userEvent.click(screen.getByRole('link', { name: 'Register' }));

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('shows an error and does not call the API when fields are empty', async () => {
    renderApp('/');

    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter your login and password/i);
    expect(api.login).not.toHaveBeenCalled();
  });

  it('logs in, stores the session and goes to /home', async () => {
    api.login.mockResolvedValue({
      id: 'abc123',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'student',
      token: 'fake.jwt.token',
      error: '',
    });
    renderApp('/');

    await userEvent.type(screen.getByLabelText('Login'), '  ada ');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith('ada', 'password123'); // login is trimmed
    expect(JSON.parse(localStorage.getItem('auth')).token).toBe('fake.jwt.token');
  });

  it('shows the server error on a failed login and stays on the page', async () => {
    api.login.mockRejectedValue(new Error('Login/Password incorrect'));
    renderApp('/');

    await userEvent.type(screen.getByLabelText('Login'), 'ada');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Login/Password incorrect');
    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('disables the button while the request is in flight', async () => {
    let resolveLogin;
    api.login.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
    renderApp('/');

    await userEvent.type(screen.getByLabelText('Login'), 'ada');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();

    resolveLogin({ id: '1', firstName: 'A', lastName: 'B', role: 'student', token: 't' });
    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument());
  });

  it('shows the success notice and prefilled login after registering', () => {
    renderApp('/', { registered: true, login: 'newuser' });

    expect(screen.getByRole('status')).toHaveTextContent(/account created/i);
    expect(screen.getByLabelText('Login')).toHaveValue('newuser');
  });
});
