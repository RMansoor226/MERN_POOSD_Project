import { useAuth } from '../AuthContext.jsx';
import AppLayout from '../components/AppLayout.jsx';
import StudentHome from './StudentHome.jsx';

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

// Picks the home page for the logged-in role (the role comes from the login response).
export default function Home() {
  const { session } = useAuth();

  return (
    <AppLayout>
      {session.role === 'student' ? <StudentHome /> : <RolePlaceholder session={session} />}
    </AppLayout>
  );
}
