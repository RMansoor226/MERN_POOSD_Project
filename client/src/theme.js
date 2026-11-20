// Light/dark theme. The choice is saved in localStorage; with no saved choice the app
// follows the operating system setting. index.html applies the theme before React loads
// so the page never flashes the wrong colors.

const KEY = 'theme';

export function storedTheme() {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // storage blocked (private mode etc.)
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not saved, but the theme still applies for this visit
  }
}

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export const systemTheme = () => (darkQuery()?.matches ? 'dark' : 'light');

export const currentTheme = () =>
  document.documentElement.dataset.theme || storedTheme() || systemTheme();

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// Calls onChange('light' | 'dark') when the OS setting changes. Returns an unsubscribe function.
export function watchSystemTheme(onChange) {
  const mq = darkQuery();
  if (!mq?.addEventListener) return () => {};
  const handler = (e) => onChange(e.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
