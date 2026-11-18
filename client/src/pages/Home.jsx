import { useAuth } from '../AuthContext.jsx';
import AppLayout from '../components/AppLayout.jsx';
import StudentHome from './StudentHome.jsx';
import { AdminTiles } from './admin/AdminHome.jsx';

// Placeholder for roles whose home page has not been built yet.
function RolePlaceholder({ session }) {
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'there';
  return (
    <>
      <h1>Welcome, {name}</h1>
      <p>
        The {session.role} home page is coming soon.
      </p>
    </>
  );
}

function AdminWelcome({ session }) {
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'there';
  return (
    <>
      <h1>Welcome, {name}</h1>
      <p className="hint admin-note">Manage the catalog, schedule and accounts.</p>
      <AdminTiles />
    </>
  );
}

// Picks the home page for the logged-in role (the role comes from the login response).
export default function Home() {
  const { session } = useAuth();

  return (
    <AppLayout>
      {session.role === 'student' && <StudentHome />}
      {session.role === 'admin' && <AdminWelcome session={session} />}
      {session.role !== 'student' && session.role !== 'admin' && <RolePlaceholder session={session} />}
    </AppLayout>
  );
}
