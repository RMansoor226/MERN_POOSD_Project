import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { auditProgram } from '../audit.js';
import { formatLocation, formatMeetingTime, instructorName, plural } from '../format.js';
import LoadError from './LoadError.jsx';

// Newest term first, using the populated term's start date
const byTermDesc = (a, b) => new Date(b.termId?.startDate ?? 0) - new Date(a.termId?.startDate ?? 0);

function groupByTerm(list) {
  const groups = new Map();
  for (const e of [...list].sort(byTermDesc)) {
    const key = String(e.termId?._id ?? e.termId);
    if (!groups.has(key)) groups.set(key, { term: e.termId, items: [] });
    groups.get(key).items.push(e);
  }
  return [...groups.values()];
}

// Drop / leave-waitlist with an in-place "are you sure"
function DropControl({ enrollment, verb, onDropped }) {
  const { session, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = `${enrollment.courseId?.code ?? 'course'} section ${enrollment.sectionId?.sectionNumber ?? ''}`.trim();

  const drop = async () => {
    setBusy(true);
    setError('');
    try {
      await api.dropEnrollment(enrollment._id, session.token);
      onDropped(label);
    } catch (err) {
      if (err.status === 401) return signOut();
      setError(err.message); // e.g. registration closed
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn-text" aria-label={`${verb} ${label}`} onClick={() => setConfirming(true)}>
        {verb}
      </button>
    );
  }
  return (
    <div className="confirm-row" role="group" aria-label={`Confirm: ${verb.toLowerCase()} ${label}`}>
      <span>
        {verb} {label}?
      </span>
      <div className="form-actions">
        <button type="button" className="btn-danger" onClick={drop} disabled={busy}>
          {busy ? 'Working…' : `Yes, ${verb.toLowerCase()}`}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
          Keep
        </button>
      </div>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ClassLine({ e }) {
  const s = e.sectionId ?? {};
  return (
    <div className="class-line">
      <div className="class-line-head">
        <Link to={`/catalog/${e.courseId?._id}`} className="course-code">
          {e.courseId?.code}
        </Link>
        <span className="class-title">{e.courseId?.title}</span>
      </div>
      <div className="hint">
        Section {s.sectionNumber} · CRN {s.crn} · {plural(e.courseId?.credits ?? 0, 'credit')}
        {s.instructorIds?.length ? ` · ${s.instructorIds.map(instructorName).join(', ')}` : ''}
      </div>
      <div className="hint">
        {s.meetings?.length ? s.meetings.map((m) => `${formatMeetingTime(m)}, ${formatLocation(m)}`).join(' · ') : 'Meeting times TBA'}
      </div>
    </div>
  );
}

function CardShell({ id, title, state, children, wide }) {
  return (
    <section className={`card ${wide ? 'card-wide' : ''}`} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {state.status === 'loading' && !state.data && <p className="hint">Loading…</p>}
      {state.status === 'error' && <LoadError message={state.error} onRetry={state.reload} />}
      {state.data && children}
    </section>
  );
}

// Enrolled classes grouped by term, with total credits and Drop.
export function MyScheduleCard({ enrollments, onChanged }) {
  const [flash, setFlash] = useState('');
  const enrolled = (enrollments.data ?? []).filter((e) => e.status === 'enrolled');

  return (
    <CardShell id="schedule-heading" title="My Schedule" state={enrollments} wide>
      {flash && (
        <p className="alert alert-success" role="status">
          {flash}
        </p>
      )}
      {enrolled.length === 0 ? (
        <p>
          You are not registered for any classes. <Link to="/classes">Find classes</Link>
        </p>
      ) : (
        groupByTerm(enrolled).map(({ term, items }) => (
          <div key={term?._id ?? 'term'} className="term-group">
            <h3>
              {term?.name ?? 'Term'}{' '}
              <span className="hint">· {plural(items.reduce((n, e) => n + (e.courseId?.credits ?? 0), 0), 'credit')}</span>
            </h3>
            <ul className="class-list">
              {items.map((e) => (
                <li key={e._id}>
                  <ClassLine e={e} />
                  <DropControl
                    enrollment={e}
                    verb="Drop"
                    onDropped={(label) => {
                      setFlash(`Dropped ${label}.`);
                      onChanged();
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </CardShell>
  );
}

// Waitlist positions with "Leave waitlist".
export function WaitlistsCard({ enrollments, onChanged }) {
  const [flash, setFlash] = useState('');
  const waiting = (enrollments.data ?? []).filter((e) => e.status === 'waitlisted');

  return (
    <CardShell id="waitlists-heading" title="Waitlists" state={enrollments}>
      {flash && (
        <p className="alert alert-success" role="status">
          {flash}
        </p>
      )}
      {waiting.length === 0 ? (
        <p className="hint">You are not on any waitlists.</p>
      ) : (
        <ul className="class-list">
          {[...waiting].sort(byTermDesc).map((e) => (
            <li key={e._id}>
              <div className="class-line-head">
                <Link to={`/catalog/${e.courseId?._id}`} className="course-code">
                  {e.courseId?.code}
                </Link>
                <span className="status-badge status-waitlist">#{e.waitlistPosition} in line</span>
              </div>
              <div className="hint">
                Section {e.sectionId?.sectionNumber} · {e.termId?.name} · moved in automatically when a seat opens
              </div>
              <DropControl
                enrollment={e}
                verb="Leave waitlist"
                onDropped={(label) => {
                  setFlash(`Left the waitlist for ${label}.`);
                  onChanged();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

// Programs + attribute info for the courses the student has taken (attribute filters need it).
async function loadAuditData(declarations, enrollments, token) {
  const programs = await Promise.all(
    declarations.map((d) =>
      api.getProgram(d.programId, token).catch((err) => {
        if (err.status === 401) throw err;
        return null;
      })
    )
  );
  const needsAttributes = programs.some((p) => p?.requirements?.some((r) => r.filter?.attribute));
  const courseInfo = {};
  if (needsAttributes) {
    const ids = [...new Set(enrollments.map((e) => String(e.courseId?._id)).filter(Boolean))];
    const courses = await Promise.all(ids.map((id) => api.getCourse(id, token).catch(() => null)));
    courses.filter(Boolean).forEach((c) => (courseInfo[String(c._id)] = c));
  }
  return { programs: programs.filter(Boolean), courseInfo };
}

// Requirement-by-requirement progress for each declared program.
export function DegreeProgressCard({ user, enrollments }) {
  const declarations = user.declarations ?? [];
  const list = enrollments.data;
  const key = declarations.map((d) => d.programId).join(',');
  const audit = useApi(
    list ? (token) => loadAuditData(declarations, list, token) : null,
    [key, list]
  );

  return (
    <section className="card card-wide" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Degree Progress</h2>
      {declarations.length === 0 && (
        <p>
          Declare a major or minor to track your progress. <Link to="/programs">Browse programs</Link>
        </p>
      )}
      {declarations.length > 0 && (audit.status === 'loading' || !list) && <p className="hint">Checking your record…</p>}
      {audit.status === 'error' && <LoadError message={audit.error} onRetry={audit.reload} />}
      {audit.data?.programs.map((program) => {
        const result = auditProgram(program, list, audit.data.courseInfo);
        return (
          <div key={program._id} className="audit-program">
            <div className="audit-head">
              <Link to={`/programs/${program._id}`} className="audit-name">
                {program.name}
              </Link>
              <span className="hint">
                {result.completeCount} of {plural(result.requirements.length, 'requirement')} complete
                {program.totalCredits != null && ` · ${result.earnedCredits} of ${program.totalCredits} credits earned`}
              </span>
            </div>
            <ul className="audit-list">
              {result.requirements.map((r) => (
                <li key={r.name} className={r.complete ? 'is-complete' : ''}>
                  <div className="audit-row">
                    <span className="audit-req">{r.name}</span>
                    <span className="audit-count">
                      {r.complete ? '✓ ' : ''}
                      {r.done} / {plural(r.target, r.unit === 'credits' ? 'credit' : 'course')}
                      {r.inProgress > 0 && <span className="hint"> · {r.inProgress} in progress</span>}
                    </span>
                  </div>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label={`${r.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={r.target}
                    aria-valuenow={r.done}
                  >
                    <span style={{ width: `${r.target ? Math.min(100, (r.done / r.target) * 100) : 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
