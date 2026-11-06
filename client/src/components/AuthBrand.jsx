import { APP_NAME, APP_TAGLINE } from '../brand.js';

// App name and tagline above the login and register cards.
export default function AuthBrand() {
  return (
    <header className="auth-brand">
      <span className="auth-brand-mark" aria-hidden="true">
        {APP_NAME.charAt(0)}
      </span>
      <p className="auth-brand-name">{APP_NAME}</p>
      <p className="auth-brand-tagline">{APP_TAGLINE}</p>
    </header>
  );
}
