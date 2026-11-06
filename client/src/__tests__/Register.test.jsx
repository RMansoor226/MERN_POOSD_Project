import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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

async function fillValidForm({ email } = {}) {
  await userEvent.type(screen.getByLabelText('First name'), 'Ada');
  await userEvent.type(screen.getByLabelText('Last name'), 'Lovelace');
  await userEvent.type(screen.getByLabelText('Login'), 'ada');
  if (email) await userEvent.type(screen.getByLabelText('Email (optional)'), email);
  await userEvent.type(screen.getByLabelText('Password'), 'password123');
  await userEvent.type(screen.getByLabelText('Confirm password'), 'password123');
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Register' }));

describe('Register page', () => {
  it('renders every field', () => {
    renderApp('/register');

    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toBeInTheDocument();
    expect(screen.getByLabelText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('shows the app name above the form', () => {
    renderApp('/register');

    expect(screen.getByText('Course Registration')).toBeInTheDocument();
  });

  it('rejects a confirm password that does not match', async () => {
    renderApp('/register');
    await userEvent.type(screen.getByLabelText('First name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Last name'), 'Lovelace');
    await userEvent.type(screen.getByLabelText('Login'), 'ada');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password124');

    await submit();

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  // Role selection is on hold (see SHOW_ROLE_SELECT in Register.jsx).
  it('hides the role dropdown while role selection is on hold', () => {
    renderApp('/register');

    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('links back to login', async () => {
    renderApp('/register');

    await userEvent.click(screen.getByRole('link', { name: 'Log in' }));

    expect(screen.getByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('shows required-field and length errors without calling the API', async () => {
    renderApp('/register');

    await submit();

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Login must be at least 3 characters.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it('rejects a malformed email but allows a blank one', async () => {
    renderApp('/register');
    await fillValidForm({ email: 'not-an-email' });

    await submit();

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it('sends no role and omits a blank email', async () => {
    api.register.mockResolvedValue({ id: '1', message: 'User registered successfully', error: '' });
    renderApp('/register');
    await fillValidForm();

    await submit();

    expect(api.register).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      login: 'ada',
      password: 'password123',
    });
  });

  it('includes the email when one is provided', async () => {
    api.register.mockResolvedValue({ id: '1', error: '' });
    renderApp('/register');
    await fillValidForm({ email: 'ada@example.com' });

    await submit();

    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com' }));
  });

  it('goes to the login page with a success notice after registering', async () => {
    api.register.mockResolvedValue({ id: '1', error: '' });
    renderApp('/register');
    await fillValidForm();

    await submit();

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/account created/i);
    expect(screen.getByLabelText('Login')).toHaveValue('ada');
  });

  it('shows backend errors, including field details, and stays on the page', async () => {
    api.register.mockRejectedValue(
      Object.assign(new Error('User with this login already exists'), {
        details: { login: 'Login is taken' },
      })
    );
    renderApp('/register');
    await fillValidForm();

    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('User with this login already exists');
    expect(screen.getByText('Login is taken')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });
});
