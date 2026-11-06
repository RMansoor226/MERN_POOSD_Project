import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api.js';
import AuthBrand from '../components/AuthBrand.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

// Role selection is on hold: the backend ignores `role` and allowing self-selected
// advisor/instructor roles needs a security decision first.
// Set to true (and re-enable role support in the API) to bring the dropdown back.
const SHOW_ROLE_SELECT = false;

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'advisor', label: 'Advisor' },
  { value: 'instructor', label: 'Instructor' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the backend registerSchema so most mistakes are caught before the request.
function validate(f) {
  const errors = {};
  if (!f.firstName.trim()) errors.firstName = 'First name is required.';
  else if (f.firstName.trim().length > 50) errors.firstName = 'First name must be 50 characters or fewer.';
  if (!f.lastName.trim()) errors.lastName = 'Last name is required.';
  else if (f.lastName.trim().length > 50) errors.lastName = 'Last name must be 50 characters or fewer.';

  const login = f.login.trim();
  if (login.length < 3) errors.login = 'Login must be at least 3 characters.';
  else if (login.length > 30) errors.login = 'Login must be 30 characters or fewer.';

  if (f.email.trim() && !EMAIL_PATTERN.test(f.email.trim())) errors.email = 'Enter a valid email address.';

  if (f.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (f.password.length > 72) errors.password = 'Password must be 72 characters or fewer.';

  if (!errors.password && f.confirmPassword !== f.password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    login: '',
    email: '',
    role: 'student',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await api.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        login: form.login.trim(),
        password: form.password,
        ...(SHOW_ROLE_SELECT && { role: form.role }),
        ...(form.email.trim() && { email: form.email.trim() }), // optional: omit when blank
      });
      navigate('/', { replace: true, state: { registered: true, login: form.login.trim() } });
    } catch (err) {
      // Backend field errors (e.g. { login: '...' }) show next to the matching input.
      if (err.details && Object.keys(err.details).length) setErrors(err.details);
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, props = {}, Input = 'input') => (
    <>
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        value={form[id]}
        onChange={set(id)}
        aria-invalid={Boolean(errors[id])}
        {...props}
      />
      {errors[id] && <span className="field-error">{errors[id]}</span>}
    </>
  );

  return (
    <main className="auth-page">
      <AuthBrand />
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create Account</h1>

        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <div className="row">
          <div>{field('firstName', 'First name', { type: 'text', autoComplete: 'given-name', autoFocus: true })}</div>
          <div>{field('lastName', 'Last name', { type: 'text', autoComplete: 'family-name' })}</div>
        </div>

        {field('login', 'Login', { type: 'text', autoComplete: 'username' })}
        {field('email', 'Email (optional)', { type: 'email', autoComplete: 'email' })}

        {SHOW_ROLE_SELECT && (
          <>
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.role && <span className="field-error">{errors.role}</span>}
          </>
        )}

        {field('password', 'Password', { autoComplete: 'new-password' }, PasswordInput)}
        {field('confirmPassword', 'Confirm password', { autoComplete: 'new-password' }, PasswordInput)}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Register'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </form>
    </main>
  );
}
