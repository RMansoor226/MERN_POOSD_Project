import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { usePrograms } from '../hooks/usePrograms.js';
import { formatDate, programLabel } from '../format.js';

// The fields PATCH /api/users/:id accepts for each declaration
const toPayload = ({ programId, catalogYear, declaredAt }) => ({ programId, catalogYear, declaredAt });

const errorText = (err) => {
  const details = Object.values(err.details || {}).join(' ');
  return [err.message, details].filter(Boolean).join(': ');
};

// Declared programs, removing one, and the "declare a program" flow.
// The user document only stores { programId, catalogYear, declaredAt }, so program names
// come from GET /api/programs.
// PATCH replaces the whole declarations array, so every save sends the full list.
export default function ProgramsCard({ user, onUserUpdated }) {
  const { session, signOut } = useAuth();
  const { status, programs } = usePrograms();

  const declarations = user.declarations ?? [];
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [confirmingId, setConfirmingId] = useState(null); // programId awaiting "Remove?" confirmation
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const declaredIds = new Set(declarations.map((d) => String(d.programId)));
  const available = programs.filter((p) => !declaredIds.has(String(p._id)));
  const nameOf = (programId) => programs.find((p) => String(p._id) === String(programId))?.name;

  let blockedReason = '';
  if (status === 'loading') blockedReason = 'Loading programs…';
  else if (status === 'unavailable') blockedReason = 'The program list could not be loaded. Please try again later.';
  else if (available.length === 0) blockedReason = 'There are no other programs to declare.';

  const close = () => {
    setOpen(false);
    setChoice('');
    setError('');
  };

  // Sends the new list; returns true on success. 401 logs out.
  const save = async (next, setErr) => {
    try {
      const updated = await api.updateDeclarations(session.id, next, session.token);
      onUserUpdated(updated);
      return true;
    } catch (err) {
      if (err.status === 401) {
        signOut();
        return false;
      }
      setErr(errorText(err));
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const program = available.find((p) => String(p._id) === choice);
    if (!program) {
      setError('Choose a program.');
      return;
    }

    setSaving(true);
    const next = [...declarations.map(toPayload), { programId: program._id, catalogYear: program.catalogYear }];
    if (await save(next, setError)) close();
    setSaving(false);
  };

  const handleRemove = async (programId) => {
    setRemoveError('');
    setRemoving(true);
    const next = declarations.filter((d) => String(d.programId) !== String(programId)).map(toPayload);
    if (await save(next, setRemoveError)) setConfirmingId(null);
    setRemoving(false);
  };

  return (
    <section className="card" aria-labelledby="programs-heading">
      <h2 id="programs-heading">Declared Programs</h2>

      {declarations.length === 0 ? (
        <p>You have not declared a major or minor yet.</p>
      ) : (
        <ul className="program-list">
          {declarations.map((d) => {
            const id = String(d.programId);
            const name = nameOf(id);
            const confirming = confirmingId === id;
            return (
              <li key={id}>
                <div className="program-row">
                  <div className="program-main">
                    {name ? <Link to={`/programs/${id}`}>{name}</Link> : <span>Program declared</span>}
                    <span className="hint">
                      Catalog {d.catalogYear} · since {formatDate(d.declaredAt, { utc: false })}
                    </span>
                  </div>
                  {!confirming && (
                    <button
                      type="button"
                      className="btn-text"
                      aria-label={`Remove ${name ?? 'this program'}`}
                      onClick={() => {
                        setRemoveError('');
                        setConfirmingId(id);
                      }}
                      disabled={removing}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {confirming && (
                  <div className="confirm-row" role="group" aria-label={`Confirm removing ${name ?? 'this program'}`}>
                    <span>Remove {name ?? 'this program'}?</span>
                    <div className="form-actions">
                      <button type="button" className="btn-danger" onClick={() => handleRemove(id)} disabled={removing}>
                        {removing ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setConfirmingId(null)}
                        disabled={removing}
                      >
                        Keep
                      </button>
                    </div>
                    {removeError && (
                      <p className="alert alert-error" role="alert">
                        {removeError}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {status === 'unavailable' && declarations.length > 0 && (
        <p className="hint">Program names could not be loaded right now.</p>
      )}

      {open ? (
        <form className="declare-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="program-select">Program</label>
          <select id="program-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Select a program…</option>
            {available.map((p) => (
              <option key={p._id} value={p._id}>
                {programLabel(p)}
              </option>
            ))}
          </select>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Declaring…' : 'Declare'}
            </button>
            <button type="button" className="btn-secondary" onClick={close} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <button type="button" onClick={() => setOpen(true)} disabled={Boolean(blockedReason)}>
            Declare a program
          </button>
          {blockedReason && <p className="hint">{blockedReason}</p>}
          <p className="hint">
            <Link to="/programs">Browse all programs</Link>
          </p>
        </>
      )}
    </section>
  );
}
