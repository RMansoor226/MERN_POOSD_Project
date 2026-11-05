import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Each test starts with no saved login session.
afterEach(() => {
  localStorage.clear();
});
