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
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminList from './pages/admin/AdminList.jsx';
import AdminForm from './pages/admin/AdminForm.jsx';

// Logged-in users skip the auth pages; logged-out users can't see Home.
function GuestOnly({ children }) {
  const { session } = useAuth();
  return session ? <Navigate to="/home" replace /> : children;
}

function RequireAuth({ children }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

// The backend rejects non-admin writes anyway; this keeps other roles off the screens.
function RequireAdmin({ children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/" replace />;
  return session.role === 'admin' ? children : <Navigate to="/home" replace />;
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
      <Route path="/admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
      <Route path="/admin/:resource" element={<RequireAdmin><AdminList /></RequireAdmin>} />
      <Route path="/admin/:resource/new" element={<RequireAdmin><AdminForm /></RequireAdmin>} />
      <Route path="/admin/:resource/:id" element={<RequireAdmin><AdminForm /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
