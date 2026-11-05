import { useAuth } from '../AuthContext.jsx';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import ComingSoonCard from '../components/ComingSoonCard.jsx';
import ProgramsCard from '../components/ProgramsCard.jsx';

function ProfileCard({ user }) {
  const rows = [
    ['Name', [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not provided'],
    ['Login', user.login],
    ['Email', user.email || 'Not provided'],
    ['Role', user.role.charAt(0).toUpperCase() + user.role.slice(1)],
  ];

  return (
    <section className="card" aria-labelledby="profile-heading">
      <h2 id="profile-heading">My Profile</h2>
      <dl className="details">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function StudentHome() {
  const { session } = useAuth();
  const { status, user, error, reload, setUser } = useCurrentUser();
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'there';

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
            <ProfileCard user={user} />
            <ProgramsCard user={user} onUserUpdated={setUser} />
          </>
        )}

        <ComingSoonCard
          title="My Schedule"
          description="Your enrolled classes for the current term will show here."
          endpoint="GET /api/enrollments (my enrollments)"
        />
        <ComingSoonCard
          title="Waitlists"
          description="Your waitlist positions will show here."
          endpoint="GET /api/enrollments (my enrollments)"
        />
        <ComingSoonCard
          title="Degree Progress"
          description="Completed and remaining requirements for your declared programs will show here."
          endpoint="GET /api/programs and a degree audit"
        />
        <ComingSoonCard
          title="Registration Dates"
          description="When registration opens and closes for upcoming terms will show here."
          endpoint="GET /api/terms"
        />
      </div>
    </>
  );
}
