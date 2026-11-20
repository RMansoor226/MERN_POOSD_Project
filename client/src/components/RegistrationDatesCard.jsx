import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, plural, registrationStatus } from '../format.js';

const MAX_TERMS = 4;

// Registration windows that are open now or coming up, soonest first (GET /api/terms).
export default function RegistrationDatesCard() {
  const terms = useApi((token) => api.getTerms(token), []);

  const now = new Date();
  const relevant = (terms.data ?? [])
    .map((term) => ({ term, status: registrationStatus(term, now) }))
    .filter(({ status }) => status.state !== 'closed')
    .sort((a, b) => new Date(a.term.registrationOpens) - new Date(b.term.registrationOpens))
    .slice(0, MAX_TERMS);

  return (
    <section className="card" aria-labelledby="registration-heading">
      <h2 id="registration-heading">Registration Dates</h2>

      {terms.status === 'loading' && <p className="hint">Loading terms…</p>}
      {terms.status === 'error' && (
        <div className="alert alert-error" role="alert">
          <p>{terms.error}</p>
          <button type="button" className="btn-secondary" onClick={terms.reload}>
            Try again
          </button>
        </div>
      )}

      {terms.status === 'ready' && relevant.length === 0 && (
        <p className="hint">No registration periods are open or scheduled right now.</p>
      )}

      {relevant.length > 0 && (
        <ul className="reg-list">
          {relevant.map(({ term, status }) => (
            <li key={term._id} className={`reg-item reg-${status.state}`}>
              <div className="reg-head">
                <span className="reg-term">{term.name}</span>
                {status.state === 'open' ? (
                  <span className="status-badge status-open">Open now</span>
                ) : (
                  <span className="status-badge status-waitlist">Upcoming</span>
                )}
              </div>
              <p className="hint">
                {formatDate(term.registrationOpens)} – {formatDate(term.registrationCloses)}
              </p>
              <p className="reg-countdown">
                {status.state === 'open'
                  ? status.days === 0
                    ? 'Closes today'
                    : `Closes in ${plural(status.days, 'day')}`
                  : `Opens in ${plural(status.days, 'day')}`}
              </p>
              <Link to={`/classes?term=${term._id}`}>Browse {term.name} classes →</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
