import { useAuth } from '../AuthContext.jsx';
import { APP_NAME } from '../brand.js';

// Shared shell for logged-in pages: top bar with the user's role and a logout button.
export default function AppLayout({ children }) {
  const { session, signOut } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">{APP_NAME}</span>
        <div className="topbar-right">
          <span className="role-badge">{session.role}</span>
          <button type="button" className="btn-secondary" onClick={signOut}>
            Log Out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
