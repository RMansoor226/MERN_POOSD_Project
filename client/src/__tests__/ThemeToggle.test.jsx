import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, SESSION } from '../test/renderApp.jsx';

vi.mock('../api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getUser: vi.fn().mockResolvedValue({ login: 'ada', role: 'student', declarations: [] }),
  getPrograms: vi.fn().mockResolvedValue([]),
}));

const theme = () => document.documentElement.dataset.theme;

// Fakes the OS dark-mode setting (jsdom has no matchMedia).
function mockSystemDark(dark) {
  const listeners = new Set();
  const mq = {
    matches: dark,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mq));
  return {
    change(next) {
      mq.matches = next;
      listeners.forEach((fn) => fn({ matches: next }));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Theme toggle', () => {
  it('defaults to light and switches to dark and back on the login page', async () => {
    renderApp('/');
    expect(theme()).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(theme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(theme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('is in the top bar once logged in and remembers the saved choice', async () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('auth', JSON.stringify(SESSION));
    renderApp('/home');
    await screen.findByRole('heading', { name: 'My Profile' });

    expect(theme()).toBe('dark');
    expect(screen.getByRole('banner')).toContainElement(screen.getByRole('button', { name: 'Switch to light mode' }));
  });

  it('follows the OS setting until the user picks one', async () => {
    const os = mockSystemDark(true);
    renderApp('/');
    expect(theme()).toBe('dark');

    os.change(false);
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(theme()).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    os.change(false); // a saved choice wins over later OS changes
    expect(theme()).toBe('dark');
  });
});
