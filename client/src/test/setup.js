import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Each test starts with no saved login session or theme.
afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
