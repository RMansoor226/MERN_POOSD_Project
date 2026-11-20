import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';
import ComingSoonCard from '../components/ComingSoonCard.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import SectionTable from '../components/SectionTable.jsx';
import LoadError from '../components/LoadError.jsx';

// Finds the Instructor record linked to this login (Instructor.userId), then every section
// they teach grouped by term, newest term first. -> { instructor: null } when not linked.
async function loadTeaching(userId, token) {
  const instructors = await api.getAllResource('/instructors', token);
  const instructor = instructors.find((i) => String(i.userId ?? '') === String(userId)) ?? null;
  if (!instructor) return { instructor: null, groups: [] };

  const [terms, sections] = await Promise.all([
    api.getTerms(token),
    api.getAllSections({ instructorId: instructor._id }, token),
  ]);
  const groups = terms
    .map((term) => ({
      term,
      sections: sections.filter((s) => String(s.termId?._id ?? s.termId) === String(term._id)),
    }))
    .filter((g) => g.sections.length > 0);
  return { instructor, groups };
}

function TeachingCard() {
  const { session } = useAuth();
  const teaching = useApi((token) => loadTeaching(session.id, token), [session.id]);
  const data = teaching.data;

  return (
    <section className="card card-wide" aria-labelledby="teaching-heading">
      <h2 id="teaching-heading">My Teaching</h2>

      {teaching.status === 'loading' && <p className="hint">Loading your sections…</p>}
      {teaching.status === 'error' && <LoadError message={teaching.error} onRetry={teaching.reload} />}

      {data && !data.instructor && (
        <p>
          Your login isn&apos;t linked to an instructor profile yet. An admin can link it under{' '}
          <strong>Admin → Instructors</strong> by choosing your account as the login.
        </p>
      )}

      {data?.instructor && (
        <>
          <p className="hint">
            {[data.instructor.title, data.instructor.email].filter(Boolean).join(' · ') || 'Instructor'}
          </p>
          {data.groups.length === 0 ? (
            <p>You are not assigned to any sections yet.</p>
          ) : (
            data.groups.map(({ term, sections }) => (
              <div key={term._id} className="term-group">
                <h3>{term.name}</h3>
                <SectionTable sections={sections} showCourse caption={`Your sections, ${term.name}`} />
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}

// Home page for advisors and instructors: their profile plus what the API supports for the role.
export default function StaffHome() {
  const { session } = useAuth();
  const { status, user, error, reload, setUser } = useCurrentUser();
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'there';

  return (
    <>
      <h1>Welcome, {name}</h1>

      {status === 'loading' && <p role="status">Loading your profile…</p>}
      {status === 'error' && <LoadError message={error} onRetry={reload} />}

      <div className="grid">
        {session.role === 'instructor' && <TeachingCard />}
        {status === 'ready' && <ProfileCard user={user} onUserUpdated={setUser} />}

        {session.role === 'instructor' && (
          <ComingSoonCard
            title="Class Rosters"
            description="The students enrolled in each of your sections will show here."
            endpoint="GET /api/enrollments?sectionId= (roster)"
          />
        )}
        {session.role === 'advisor' && (
          <>
            <ComingSoonCard
              title="My Advisees"
              description="Students assigned to you, with their declared programs, will show here."
              endpoint="advisor access to student records (GET /api/users is admin-only)"
            />
            <ComingSoonCard
              title="Degree Audits"
              description="Completed and remaining requirements for each advisee will show here."
              endpoint="GET /api/enrollments (completed courses)"
            />
          </>
        )}
        <section className="card">
          <h2>Browse</h2>
          <p>
            <Link to="/catalog">Course Catalog</Link>
          </p>
          <p>
            <Link to="/classes">Class Search</Link>
          </p>
          <p>
            <Link to="/programs">Programs</Link>
          </p>
        </section>
      </div>
    </>
  );
}
