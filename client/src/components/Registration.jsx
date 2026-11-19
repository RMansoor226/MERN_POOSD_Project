import { useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, registrationStatus, seatInfo } from '../format.js';

const ACTIVE = ['enrolled', 'waitlisted'];

// What a student can do with one section row.
function RegisterCell({ section, term, mine, sameCourse, busy, onRegister }) {
  if (mine?.status === 'enrolled') return <span className="status-badge status-open">Enrolled</span>;
  if (mine?.status === 'waitlisted') {
    return <span className="status-badge status-waitlist">Waitlisted #{mine.waitlistPosition}</span>;
  }
  if (mine?.status === 'completed') return <span className="hint">Completed ({mine.grade})</span>;
  // the API allows one section of a course per term
  if (sameCourse) {
    return (
      <span className="hint">
        {sameCourse.status === 'enrolled' ? 'Registered' : 'Waitlisted'} in {sameCourse.sectionId?.sectionNumber}
      </span>
    );
  }
  if (section.status !== 'open') return <span className="hint">Not open</span>;

  if (term) {
    const reg = registrationStatus(term);
    if (reg.state === 'upcoming') return <span className="hint">Opens {formatDate(term.registrationOpens)}</span>;
    if (reg.state === 'closed') return <span className="hint">Registration closed</span>;
  }

  const seats = seatInfo(section);
  const seatFree = seats.open > 0 && seats.waitCount === 0; // a waitlist gets free seats first
  const waitFree = seats.waitCap > seats.waitCount;
  if (!seatFree && !waitFree) return <span className="hint">Full</span>;

  const label = seatFree ? 'Register' : 'Join waitlist';
  const code = section.courseId?.code ?? '';
  return (
    <button
      type="button"
      className={seatFree ? 'btn-small' : 'btn-secondary btn-small'}
      onClick={() => onRegister(section)}
      disabled={busy}
      aria-label={`${label} for ${code} section ${section.sectionNumber}`}
    >
      {busy ? 'Working…' : label}
    </button>
  );
}

/*
 * Registration for pages that list sections (class search, course detail).
 * Returns:
 *   action(section, term)  cell for SectionTable's action column (undefined for non-students)
 *   banner                 the result or refusal message
 * onChanged() runs after a successful registration so the page can refresh seat counts.
 */
export function useRegistration(onChanged) {
  const { session, signOut } = useAuth();
  const isStudent = session.role === 'student';
  const mine = useApi(isStudent ? (token) => api.getAllEnrollments({}, token) : null, [isStudent]);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState(null); // { kind: 'success' | 'error', text, detail?, warnings? }

  const bySection = Object.fromEntries(
    (mine.data ?? [])
      .filter((e) => ACTIVE.includes(e.status) || e.status === 'completed')
      .map((e) => [String(e.sectionId?._id ?? e.sectionId), e])
  );

  const idOf = (v) => String(v?._id ?? v);
  const byCourseTerm = Object.fromEntries(
    (mine.data ?? [])
      .filter((e) => ACTIVE.includes(e.status))
      .map((e) => [`${idOf(e.courseId)}:${idOf(e.termId)}`, e])
  );

  const register = async (section) => {
    const label = `${section.courseId?.code ?? 'this course'} section ${section.sectionNumber}`;
    setBusyId(section._id);
    setFlash(null);
    try {
      const result = await api.registerForSection(section._id, session.token);
      setFlash({
        kind: 'success',
        text:
          result.status === 'enrolled'
            ? `You're registered for ${label}.`
            : `${label} is full. You're #${result.waitlistPosition} on the waitlist and will be moved in automatically when a seat opens.`,
        warnings: result.warnings ?? [],
      });
      mine.reload();
      onChanged?.();
    } catch (err) {
      if (err.status === 401) return signOut();
      setFlash({ kind: 'error', text: `Couldn't register for ${label}: ${err.message}`, detail: err.details?.prereqs });
    } finally {
      setBusyId(null);
    }
  };

  const action = isStudent
    ? (section, term) => (
        <RegisterCell
          section={section}
          term={term}
          mine={bySection[String(section._id)]}
          sameCourse={byCourseTerm[`${idOf(section.courseId)}:${idOf(section.termId)}`]}
          busy={busyId === section._id}
          onRegister={register}
        />
      )
    : undefined;

  const banner = flash && (
    <div className={`alert ${flash.kind === 'success' ? 'alert-success' : 'alert-error'}`} role={flash.kind === 'success' ? 'status' : 'alert'}>
      <p>{flash.text}</p>
      {flash.detail && <p>{flash.detail}.</p>}
      {flash.warnings?.map((w) => (
        <p key={w} className="hint">
          Note: {w}.
        </p>
      ))}
    </div>
  );

  return { action, banner };
}
