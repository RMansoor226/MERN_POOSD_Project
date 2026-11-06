import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getPrograms: vi.fn().mockRejectedValue(Object.assign(new Error('Route not found'), { status: 404 })),
  updateDeclarations: vi.fn(),
  updateProfile: vi.fn(),
}));

const USER = {
  _id: 'abc123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  login: 'ada',
  email: 'ada@example.com',
  role: 'student',
  declarations: [],
};

async function openEditor() {
  localStorage.setItem('auth', JSON.stringify(SESSION));
  renderApp('/home');
  const card = (await screen.findByRole('heading', { name: 'My Profile' })).closest('section');
  await userEvent.click(within(card).getByRole('button', { name: 'Edit profile' }));
  return card;
}

const save = (card) => userEvent.click(within(card).getByRole('button', { name: 'Save' }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getUser.mockResolvedValue(USER);
});

describe('Edit profile', () => {
  it('opens a form filled with the current profile', async () => {
    await openEditor();

    expect(screen.getByLabelText('First name')).toHaveValue('Ada');
    expect(screen.getByLabelText('Last name')).toHaveValue('Lovelace');
    expect(screen.getByLabelText('Email (optional)')).toHaveValue('ada@example.com');
  });

  it('saves changes, updates the card and the welcome heading, and keeps them after reload', async () => {
    api.updateProfile.mockResolvedValue({ ...USER, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });
    const card = await openEditor();

    const first = screen.getByLabelText('First name');
    await userEvent.clear(first);
    await userEvent.type(first, '  Grace ');
    const last = screen.getByLabelText('Last name');
    await userEvent.clear(last);
    await userEvent.type(last, 'Hopper');
    const email = screen.getByLabelText('Email (optional)');
    await userEvent.clear(email);
    await userEvent.type(email, 'grace@example.com');
    await save(card);

    expect(api.updateProfile).toHaveBeenCalledWith(
      'abc123',
      { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
      'fake.jwt.token'
    );
    expect(await within(card).findByRole('status')).toHaveTextContent('Profile updated.');
    expect(card).toHaveTextContent('Grace Hopper');
    expect(card).toHaveTextContent('grace@example.com');
    expect(screen.getByRole('heading', { name: 'Welcome, Grace Hopper' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('auth')).firstName).toBe('Grace');
  });

  it('sends an empty email to remove it', async () => {
    api.updateProfile.mockResolvedValue({ ...USER, email: undefined });
    const card = await openEditor();

    await userEvent.clear(screen.getByLabelText('Email (optional)'));
    await save(card);

    expect(api.updateProfile).toHaveBeenCalledWith('abc123', expect.objectContaining({ email: '' }), 'fake.jwt.token');
    expect(await within(card).findByText('Not provided')).toBeInTheDocument();
  });

  it('validates before calling the API', async () => {
    const card = await openEditor();

    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.clear(screen.getByLabelText('Email (optional)'));
    await userEvent.type(screen.getByLabelText('Email (optional)'), 'not-an-email');
    await save(card);

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('cancel discards changes', async () => {
    const card = await openEditor();

    await userEvent.type(screen.getByLabelText('First name'), 'zzz');
    await userEvent.click(within(card).getByRole('button', { name: 'Cancel' }));

    expect(card).toHaveTextContent('Ada Lovelace');
    expect(card).not.toHaveTextContent('zzz');
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('shows backend errors and stays in the form', async () => {
    api.updateProfile.mockRejectedValue(
      Object.assign(new Error('Validation failed'), { status: 400, details: { email: 'Email is already in use' } })
    );
    const card = await openEditor();

    await save(card);

    expect(await within(card).findByRole('alert')).toHaveTextContent('Validation failed');
    expect(screen.getByText('Email is already in use')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
  });

  it('logs out when the token has expired (401)', async () => {
    api.updateProfile.mockRejectedValue(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
    const card = await openEditor();

    await save(card);

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });
});
