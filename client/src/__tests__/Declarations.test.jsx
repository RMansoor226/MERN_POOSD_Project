import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../api.js';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  getAllEnrollments: vi.fn().mockResolvedValue([]),
  getProgram: vi.fn().mockRejectedValue(Object.assign(new Error('Program not found'), { status: 404 })),
  getTerms: vi.fn().mockResolvedValue([]),
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn(),
  getPrograms: vi.fn(),
  updateDeclarations: vi.fn(),
}));

const CS = { _id: '65a000000000000000000001', name: 'Computer Science', type: 'major', degree: 'BS', catalogYear: 2025 };
const MATH = { _id: '65a000000000000000000002', name: 'Mathematics', type: 'minor', catalogYear: 2025 };
const PHYSICS = { _id: '65a000000000000000000003', name: 'Physics', type: 'major', degree: 'BS', catalogYear: 2024 };
const PROGRAMS = [CS, MATH, PHYSICS];

const CS_DECLARATION = { programId: CS._id, catalogYear: 2025, declaredAt: '2026-01-15T00:00:00.000Z' };

const USER = {
  _id: 'abc123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  login: 'ada',
  role: 'student',
  declarations: [],
};

async function renderPrograms() {
  localStorage.setItem('auth', JSON.stringify(SESSION));
  renderApp('/home');
  const card = (await screen.findByRole('heading', { name: 'Declared Programs' })).closest('section');
  return card;
}

const openForm = () => userEvent.click(screen.getByRole('button', { name: 'Declare a program' }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getUser.mockResolvedValue(USER);
  api.getPrograms.mockResolvedValue(PROGRAMS);
});

describe('Declare a program', () => {
  it('shows a Declare a program button when no program is declared', async () => {
    const card = await renderPrograms();

    expect(within(card).getByText(/have not declared a major or minor/i)).toBeInTheDocument();
    await waitFor(() => expect(within(card).getByRole('button', { name: 'Declare a program' })).toBeEnabled());
  });

  it('disables the button with a note while the program list is unavailable', async () => {
    api.getPrograms.mockRejectedValue(Object.assign(new Error('Route not found'), { status: 404 }));
    const card = await renderPrograms();

    expect(await within(card).findByText(/program list could not be loaded/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Declare a program' })).toBeDisabled();
  });

  it('shows program names for existing declarations when the catalog loads', async () => {
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION] });
    const card = await renderPrograms();

    expect(await within(card).findByText('Computer Science')).toBeInTheDocument();
    expect(card).toHaveTextContent('Catalog 2025');
  });

  it('opens a form listing only programs that are not already declared', async () => {
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION] });
    await renderPrograms();
    await screen.findByText('Computer Science');

    await openForm();

    const options = within(screen.getByLabelText('Program')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Select a program…',
      'Mathematics (minor) — Catalog 2025',
      'Physics (BS major) — Catalog 2024',
    ]);
  });

  it('asks the student to choose a program before saving', async () => {
    await renderPrograms();
    await screen.findByRole('button', { name: 'Declare a program' });
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Declare' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a program.');
    expect(api.updateDeclarations).not.toHaveBeenCalled();
  });

  it('sends the existing declarations plus the new one, then shows it', async () => {
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION] });
    const newDeclaration = { programId: PHYSICS._id, catalogYear: 2024, declaredAt: '2026-11-05T00:00:00.000Z' };
    api.updateDeclarations.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION, newDeclaration] });
    await renderPrograms();
    await screen.findByText('Computer Science');
    await openForm();

    await userEvent.selectOptions(screen.getByLabelText('Program'), PHYSICS._id);
    await userEvent.click(screen.getByRole('button', { name: 'Declare' }));

    // PATCH replaces the whole array, so the old declaration must be included
    expect(api.updateDeclarations).toHaveBeenCalledWith(
      'abc123',
      [CS_DECLARATION, { programId: PHYSICS._id, catalogYear: 2024 }],
      'fake.jwt.token'
    );
    expect(await screen.findByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.queryByLabelText('Program')).not.toBeInTheDocument(); // form closed
  });

  it('can cancel without saving', async () => {
    await renderPrograms();
    await screen.findByRole('button', { name: 'Declare a program' });
    await openForm();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Program')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Declare a program' })).toBeInTheDocument();
    expect(api.updateDeclarations).not.toHaveBeenCalled();
  });

  it('keeps the form open and shows the error when saving fails', async () => {
    api.updateDeclarations.mockRejectedValue(
      Object.assign(new Error('Validation Failed'), {
        status: 400,
        details: { declarations: 'the same program cannot be declared twice' },
      })
    );
    await renderPrograms();
    await screen.findByRole('button', { name: 'Declare a program' });
    await openForm();

    await userEvent.selectOptions(screen.getByLabelText('Program'), CS._id);
    await userEvent.click(screen.getByRole('button', { name: 'Declare' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Validation Failed: the same program cannot be declared twice');
    expect(screen.getByLabelText('Program')).toBeInTheDocument();
    expect(screen.getByText(/have not declared a major or minor/i)).toBeInTheDocument();
  });

  it('logs out if the token expires while saving', async () => {
    api.updateDeclarations.mockRejectedValue(Object.assign(new Error('Invalid or expired token'), { status: 401 }));
    await renderPrograms();
    await screen.findByRole('button', { name: 'Declare a program' });
    await openForm();

    await userEvent.selectOptions(screen.getByLabelText('Program'), CS._id);
    await userEvent.click(screen.getByRole('button', { name: 'Declare' }));

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('disables the button when every program is already declared', async () => {
    api.getPrograms.mockResolvedValue([CS]);
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION] });
    const card = await renderPrograms();

    expect(await within(card).findByText(/no other programs to declare/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Declare a program' })).toBeDisabled();
  });
});

describe('Remove a declared program', () => {
  const MATH_DECLARATION = { programId: MATH._id, catalogYear: 2025, declaredAt: '2026-02-01T00:00:00.000Z' };

  async function renderWithTwo() {
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION, MATH_DECLARATION] });
    const card = await renderPrograms();
    await within(card).findByRole('link', { name: 'Computer Science' });
    return card;
  }

  it('links each declared program to its detail page', async () => {
    const card = await renderWithTwo();

    expect(within(card).getByRole('link', { name: 'Computer Science' })).toHaveAttribute('href', `/programs/${CS._id}`);
    expect(within(card).getByRole('link', { name: 'Mathematics' })).toHaveAttribute('href', `/programs/${MATH._id}`);
  });

  it('asks for confirmation, then sends the list without that program', async () => {
    api.updateDeclarations.mockResolvedValue({ ...USER, declarations: [MATH_DECLARATION] });
    const card = await renderWithTwo();

    await userEvent.click(within(card).getByRole('button', { name: 'Remove Computer Science' }));
    expect(api.updateDeclarations).not.toHaveBeenCalled();
    const confirm = within(card).getByRole('group', { name: 'Confirm removing Computer Science' });
    expect(confirm).toHaveTextContent('Remove Computer Science?');

    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, remove' }));

    expect(api.updateDeclarations).toHaveBeenCalledWith('abc123', [MATH_DECLARATION], 'fake.jwt.token');
    await waitFor(() => expect(within(card).queryByRole('link', { name: 'Computer Science' })).not.toBeInTheDocument());
    expect(within(card).getByRole('link', { name: 'Mathematics' })).toBeInTheDocument();
    expect(within(card).queryByRole('group')).not.toBeInTheDocument();
  });

  it('can back out with Keep', async () => {
    const card = await renderWithTwo();

    await userEvent.click(within(card).getByRole('button', { name: 'Remove Mathematics' }));
    await userEvent.click(within(card).getByRole('button', { name: 'Keep' }));

    expect(within(card).queryByRole('group')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Remove Mathematics' })).toBeInTheDocument();
    expect(api.updateDeclarations).not.toHaveBeenCalled();
  });

  it('removing the last program sends an empty list', async () => {
    api.getUser.mockResolvedValue({ ...USER, declarations: [CS_DECLARATION] });
    api.updateDeclarations.mockResolvedValue({ ...USER, declarations: [] });
    const card = await renderPrograms();
    await within(card).findByRole('link', { name: 'Computer Science' });

    await userEvent.click(within(card).getByRole('button', { name: 'Remove Computer Science' }));
    await userEvent.click(within(card).getByRole('button', { name: 'Yes, remove' }));

    expect(api.updateDeclarations).toHaveBeenCalledWith('abc123', [], 'fake.jwt.token');
    expect(await within(card).findByText(/have not declared a major or minor/i)).toBeInTheDocument();
  });

  it('keeps the program and shows the error when removing fails', async () => {
    api.updateDeclarations.mockRejectedValue(Object.assign(new Error('Cannot reach the server.'), { status: 0 }));
    const card = await renderWithTwo();

    await userEvent.click(within(card).getByRole('button', { name: 'Remove Computer Science' }));
    await userEvent.click(within(card).getByRole('button', { name: 'Yes, remove' }));

    expect(await within(card).findByRole('alert')).toHaveTextContent('Cannot reach the server.');
    expect(within(card).getByRole('link', { name: 'Computer Science' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Yes, remove' })).toBeEnabled();
  });
});
