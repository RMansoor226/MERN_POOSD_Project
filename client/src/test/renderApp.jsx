import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../AuthContext.jsx';

// Renders the full app (routes + auth) starting at the given URL (may include ?query).
export function renderApp(path = '/', state) {
  const [pathname, search] = path.split('?');
  return render(
    <MemoryRouter initialEntries={[{ pathname, search: search ? `?${search}` : '', state }]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

export const SESSION = {
  id: 'abc123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'student',
  token: 'fake.jwt.token',
};
