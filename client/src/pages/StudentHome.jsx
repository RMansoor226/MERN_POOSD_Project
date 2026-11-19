import { useAuth } from '../AuthContext.jsx';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { DegreeProgressCard, MyScheduleCard, WaitlistsCard } from '../components/EnrollmentCards.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import ProgramsCard from '../components/ProgramsCard.jsx';
import RegistrationDatesCard from '../components/RegistrationDatesCard.jsx';

export default function StudentHome() {
  const { session } = useAuth();
  const { status, user, error, reload, setUser } = useCurrentUser();
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'there';
  // one request feeds the schedule, waitlist and degree progress cards
  const enrollments = useApi((token) => api.getAllEnrollments({}, token), []);

  return (
    <>
      <h1>Welcome, {name}</h1>

      {status === 'loading' && <p role="status">Loading your profile…</p>}

      {status === 'error' && (
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <div className="grid">
        {status === 'ready' && (
          <>
            <ProfileCard user={user} onUserUpdated={setUser} />
            <ProgramsCard user={user} onUserUpdated={setUser} />
          </>
        )}

        <RegistrationDatesCard />
        <WaitlistsCard enrollments={enrollments} onChanged={enrollments.reload} />
        <MyScheduleCard enrollments={enrollments} onChanged={enrollments.reload} />
        {status === 'ready' && <DegreeProgressCard user={user} enrollments={enrollments} />}
      </div>
    </>
  );
}
