import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { APP_NAME } from '../brand.js';
import ThemeToggle from './ThemeToggle.jsx';

const NAV = [
  { to: '/home', label: 'Home' },
  { to: '/catalog', label: 'Course Catalog' },
  { to: '/classes', label: 'Class Search' },
  { to: '/programs', label: 'Programs' },
];

// Shared shell for logged-in pages: top bar with navigation, the user's role and a logout button.
export default function AppLayout({ children }) {
  const { session, signOut } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            {APP_NAME.charAt(0)}
          </span>
          {APP_NAME}
        </span>
        <nav className="topnav" aria-label="Main">
          {[...NAV, ...(session.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : [])].map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <ThemeToggle />
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
