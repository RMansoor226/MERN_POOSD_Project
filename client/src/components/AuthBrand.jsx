import { APP_NAME, APP_TAGLINE } from '../brand.js';
import ThemeToggle from './ThemeToggle.jsx';

// App name and tagline above the login and register cards, plus the theme toggle
// pinned to the corner of the page.
export default function AuthBrand() {
  return (
    <>
      <ThemeToggle className="theme-toggle-floating" />
      <header className="auth-brand">
        <span className="auth-brand-mark" aria-hidden="true">
          {APP_NAME.charAt(0)}
        </span>
        <p className="auth-brand-name">{APP_NAME}</p>
        <p className="auth-brand-tagline">{APP_TAGLINE}</p>
      </header>
    </>
  );
}
