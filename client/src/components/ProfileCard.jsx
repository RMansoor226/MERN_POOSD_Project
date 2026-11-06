import { useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same limits as the backend updateUserSchema (names up to 50 characters, optional email).
function validate(f) {
  const errors = {};
  if (!f.firstName.trim()) errors.firstName = 'First name is required.';
  else if (f.firstName.trim().length > 50) errors.firstName = 'First name must be 50 characters or fewer.';
  if (!f.lastName.trim()) errors.lastName = 'Last name is required.';
  else if (f.lastName.trim().length > 50) errors.lastName = 'Last name must be 50 characters or fewer.';
  if (f.email.trim() && !EMAIL_PATTERN.test(f.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

const toForm = (user) => ({
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  email: user.email ?? '',
});

// Shows the student's profile, with an Edit button that turns it into a form.
// Saving calls PATCH /api/users/:id and updates the card and the welcome heading.
export default function ProfileCard({ user, onUserUpdated }) {
  const { session, signOut, updateSession } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const startEditing = () => {
    setForm(toForm(user));
    setErrors({});
    setFormError('');
    setSaved(false);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setErrors({});
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const updated = await api.updateProfile(
        session.id,
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(), // '' clears the email on the backend
        },
        session.token
      );
      onUserUpdated(updated);
      updateSession({ firstName: updated.firstName, lastName: updated.lastName });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      if (err.status === 401) {
        signOut();
        return;
      }
      if (err.details && Object.keys(err.details).length) setErrors(err.details);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (id, label, props = {}) => (
    <>
      <label htmlFor={`profile-${id}`}>{label}</label>
      <input
        id={`profile-${id}`}
        value={form[id]}
        onChange={set(id)}
        aria-invalid={Boolean(errors[id])}
        disabled={saving}
        {...props}
      />
      {errors[id] && <span className="field-error">{errors[id]}</span>}
    </>
  );

  if (editing) {
    return (
      <section className="card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">My Profile</h2>
        <form className="stacked-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className="alert alert-error" role="alert">
              {formError}
            </p>
          )}
          {field('firstName', 'First name', { type: 'text', autoComplete: 'given-name', autoFocus: true })}
          {field('lastName', 'Last name', { type: 'text', autoComplete: 'family-name' })}
          {field('email', 'Email (optional)', { type: 'email', autoComplete: 'email' })}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={cancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    );
  }

  const rows = [
    ['Name', [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not provided'],
    ['Login', user.login],
    ['Email', user.email || 'Not provided'],
    ['Role', user.role.charAt(0).toUpperCase() + user.role.slice(1)],
  ];

  return (
    <section className="card" aria-labelledby="profile-heading">
      <h2 id="profile-heading">My Profile</h2>
      {saved && (
        <p className="alert alert-success" role="status">
          Profile updated.
        </p>
      )}
      <dl className="details">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn-secondary" onClick={startEditing}>
        Edit profile
      </button>
    </section>
  );
}
