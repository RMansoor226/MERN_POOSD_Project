import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, saveTheme, storedTheme, watchSystemTheme } from '../theme.js';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

// Sun/moon button that flips between light and dark and remembers the choice.
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);

  // the page attribute changes at the same moment as the button, never a frame later
  const show = (t) => {
    applyTheme(t);
    setTheme(t);
  };

  useEffect(() => applyTheme(theme), []); // eslint-disable-line react-hooks/exhaustive-deps

  // with no saved choice, keep following the OS setting
  useEffect(() => watchSystemTheme((t) => !storedTheme() && show(t)), []);

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        saveTheme(next);
        show(next);
      }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
