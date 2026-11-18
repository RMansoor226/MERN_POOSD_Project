import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatLocation, formatMeetingTime } from '../format.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';

export const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
const STATUS_ORDER = { enrolled: 0, completed: 1, waitlisted: 2, dropped: 3, withdrawn: 4 };

const studentName = (s) => [s?.lastName, s?.firstName].filter(Boolean).join(', ') || s?.login || 'Student';

async function loadRoster(sectionId, token) {
  const [section, enrollments] = await Promise.all([
    api.getResource('/sections', sectionId, token),
    api.getAllEnrollments({ sectionId }, token),
  ]);
  return { section, enrollments };
}

// Grade entry for one student: completes an enrolled student, or changes a completed grade.
function GradeCell({ enrollment, onSaved }) {
  const { session, signOut } = useAuth();
  const [grade, setGrade] = useState(enrollment.grade ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const who = studentName(enrollment.studentId);
  const completing = enrollment.status === 'enrolled';

  if (!completing && enrollment.status !== 'completed') return <span className="hint">—</span>;

  const save = async (e) => {
    e.preventDefault();
    if (!grade) {
      setError('Choose a grade.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = completing ? { status: 'completed', grade } : { grade };
      await api.gradeEnrollment(enrollment._id, body, session.token);
      onSaved(`${completing ? 'Recorded' : 'Changed'} ${who}'s grade: ${grade}.`);
    } catch (err) {
      if (err.status === 401) return signOut();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grade-form" onSubmit={save}>
      <label htmlFor={`grade-${enrollment._id}`} className="visually-hidden">
        Grade for {who}
      </label>
      <select id={`grade-${enrollment._id}`} value={grade} onChange={(e) => setGrade(e.target.value)} disabled={busy}>
        <option value="">—</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="btn-small"
        disabled={busy || (!completing && grade === enrollment.grade)}
        aria-label={`${completing ? 'Submit' : 'Update'} grade for ${who}`}
      >
        {busy ? 'Saving…' : completing ? 'Submit' : 'Update'}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// Class roster for one section (instructor of the section, or an admin).
export default function Roster() {
  const { sectionId } = useParams();
  const roster = useApi((token) => loadRoster(sectionId, token), [sectionId]);
  const [showDropped, setShowDropped] = useState(false);
  const [flash, setFlash] = useState('');

  const section = roster.data?.section;
  const all = roster.data?.enrollments ?? [];
  const shown = all
    .filter((e) => showDropped || !['dropped', 'withdrawn'].includes(e.status))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.status === 'waitlisted' ? a.waitlistPosition - b.waitlistPosition : 0) ||
        studentName(a.studentId).localeCompare(studentName(b.studentId))
    );
  const count = (status) => all.filter((e) => e.status === status).length;

  return (
    <AppLayout>
      <p className="breadcrumb">
        <Link to="/home">← My Teaching</Link>
      </p>

      {roster.status === 'error' && <LoadError message={roster.error} onRetry={roster.reload} />}
      {roster.status === 'loading' && !roster.data && <p role="status">Loading roster…</p>}

      {section && (
        <>
          <h1>
            {section.courseId?.code} section {section.sectionNumber}
          </h1>
          <p className="hint admin-note">
            {section.courseId?.title} · {section.termId?.name} · CRN {section.crn}
            {section.meetings?.length > 0 &&
              ` · ${section.meetings.map((m) => `${formatMeetingTime(m)}, ${formatLocation(m)}`).join(' · ')}`}
          </p>

          <div className="roster-summary">
            <span className="status-badge status-open">
              {count('enrolled') + count('completed')} / {section.capacity} seats
            </span>
            <span className="status-badge status-waitlist">{count('waitlisted')} waitlisted</span>
            <span className="hint">{count('completed')} graded</span>
            <label className="check-label">
              <input type="checkbox" checked={showDropped} onChange={(e) => setShowDropped(e.target.checked)} />
              Show dropped and withdrawn
            </label>
          </div>

          {flash && (
            <p className="alert alert-success" role="status">
              {flash}
            </p>
          )}

          {shown.length === 0 ? (
            <p className="card">No students are registered for this section yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-table">
                <caption className="visually-hidden">Roster</caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Login</th>
                    <th scope="col">Email</th>
                    <th scope="col">Status</th>
                    <th scope="col">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e._id}>
                      <td>{studentName(e.studentId)}</td>
                      <td className="mono">{e.studentId?.login}</td>
                      <td>{e.studentId?.email || '—'}</td>
                      <td>
                        {e.status === 'waitlisted' ? `Waitlisted #${e.waitlistPosition}` : e.status[0].toUpperCase() + e.status.slice(1)}
                      </td>
                      <td>
                        <GradeCell
                          enrollment={e}
                          onSaved={(msg) => {
                            setFlash(msg);
                            roster.reload();
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
