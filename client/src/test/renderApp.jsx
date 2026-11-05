import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../AuthContext.jsx';

// Renders the full app (routes + auth) starting at the given URL.
export function renderApp(path = '/', state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
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
