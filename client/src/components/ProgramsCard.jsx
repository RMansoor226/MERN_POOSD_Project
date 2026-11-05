import { useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { usePrograms } from '../hooks/usePrograms.js';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// "Computer Science (BS major) — Catalog 2025"
function programLabel(p) {
  const kind = [p.degree, p.type].filter(Boolean).join(' ');
  return `${p.name}${kind ? ` (${kind})` : ''} — Catalog ${p.catalogYear}`;
}

// Declared programs plus the "declare a program" flow.
// The user document only stores { programId, catalogYear, declaredAt }, so program names
// come from GET /api/programs when that endpoint exists.
export default function ProgramsCard({ user, onUserUpdated }) {
  const { session, signOut } = useAuth();
  const { status, programs } = usePrograms();

  const declarations = user.declarations ?? [];
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const declaredIds = new Set(declarations.map((d) => String(d.programId)));
  const available = programs.filter((p) => !declaredIds.has(String(p._id)));
  const nameOf = (programId) => programs.find((p) => String(p._id) === String(programId))?.name;

  let blockedReason = '';
  if (status === 'loading') blockedReason = 'Loading programs…';
  else if (status === 'unavailable') blockedReason = 'The program list is not available yet.';
  else if (available.length === 0) blockedReason = 'There are no other programs to declare.';

  const close = () => {
    setOpen(false);
    setChoice('');
    setError('');
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
    try {
      // PATCH replaces the whole array, so send the existing declarations plus the new one
      const next = [
        ...declarations.map(({ programId, catalogYear, declaredAt }) => ({ programId, catalogYear, declaredAt })),
        { programId: program._id, catalogYear: program.catalogYear },
      ];
      const updated = await api.updateDeclarations(session.id, next, session.token);
      onUserUpdated(updated);
      close();
    } catch (err) {
      if (err.status === 401) {
        signOut();
        return;
      }
      const details = Object.values(err.details || {}).join(' ');
      setError([err.message, details].filter(Boolean).join(': '));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card" aria-labelledby="programs-heading">
      <h2 id="programs-heading">Declared Programs</h2>

      {declarations.length === 0 ? (
        <p>You have not declared a major or minor yet.</p>
      ) : (
        <ul className="program-list">
          {declarations.map((d) => (
            <li key={d.programId}>
              <span>{nameOf(d.programId) ?? 'Program declared'}</span>
              <span className="hint">
                Catalog {d.catalogYear} · since {formatDate(d.declaredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {status === 'unavailable' && declarations.length > 0 && (
        <p className="hint">Program names will appear once the programs endpoint exists.</p>
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
        </>
      )}
    </section>
  );
}
