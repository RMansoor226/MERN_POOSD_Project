import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { plural } from '../format.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';

const GROUPS = [
  { type: 'major', title: 'Majors' },
  { type: 'minor', title: 'Minors' },
  { type: 'certificate', title: 'Certificates' },
];

// Every program, grouped by type (GET /api/programs, all pages).
export default function Programs() {
  const programs = useApi((token) => api.getPrograms(token), []);
  const list = programs.data ?? [];

  return (
    <AppLayout>
      <h1>Programs</h1>

      {programs.status === 'error' && <LoadError message={programs.error} onRetry={programs.reload} />}
      {programs.status === 'loading' && <p role="status">Loading programs…</p>}
      {programs.status === 'ready' && list.length === 0 && <p className="card">No programs have been added yet.</p>}

      {GROUPS.map(({ type, title }) => {
        const group = list.filter((p) => p.type === type);
        if (group.length === 0) return null;
        return (
          <section key={type} className="section-block" aria-labelledby={`programs-${type}`}>
            <h2 id={`programs-${type}`}>{title}</h2>
            <ul className="course-list">
              {group.map((p) => (
                <li key={p._id} className="card course-item">
                  <div className="course-item-head">
                    <Link to={`/programs/${p._id}`} className="course-link">
                      {p.name}
                      {p.degree && <span className="course-code program-degree">{p.degree}</span>}
                    </Link>
                    <span className="hint">Catalog {p.catalogYear}</span>
                  </div>
                  <div className="hint">
                    {[
                      p.totalCredits != null && plural(p.totalCredits, 'credit'),
                      plural(p.requirements?.length ?? 0, 'requirement'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AppLayout>
  );
}
