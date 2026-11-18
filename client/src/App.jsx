import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import CourseCatalog from './pages/CourseCatalog.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import ClassSearch from './pages/ClassSearch.jsx';
import Programs from './pages/Programs.jsx';
import ProgramDetail from './pages/ProgramDetail.jsx';

// Logged-in users skip the auth pages; logged-out users can't see Home.
function GuestOnly({ children }) {
  const { session } = useAuth();
  return session ? <Navigate to="/home" replace /> : children;
}

function RequireAuth({ children }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/catalog" element={<RequireAuth><CourseCatalog /></RequireAuth>} />
      <Route path="/catalog/:id" element={<RequireAuth><CourseDetail /></RequireAuth>} />
      <Route path="/classes" element={<RequireAuth><ClassSearch /></RequireAuth>} />
      <Route path="/programs" element={<RequireAuth><Programs /></RequireAuth>} />
      <Route path="/programs/:id" element={<RequireAuth><ProgramDetail /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
