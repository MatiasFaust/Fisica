import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { onSyncError } from './services/store';
import logo from './assets/logo.svg';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RepositoryPage from './pages/RepositoryPage';
import TopicsPage from './pages/TopicsPage';
import TopicDetailPage from './pages/TopicDetailPage';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import WhiteboardLobbyPage from './pages/WhiteboardLobbyPage';
import WhiteboardPage from './pages/WhiteboardPage';
import SavedClassPage from './pages/SavedClassPage';
import MyFilesPage from './pages/MyFilesPage';
import StudentsPage from './pages/StudentsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import WaitingAccessPage from './pages/WaitingAccessPage';

function RequireAuth({ children, teacherOnly = false }) {
  const { user, isTeacher } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (teacherOnly && !isTeacher) return <Navigate to="/inicio" replace />;
  return children;
}

function Splash() {
  return (
    <div className="splash">
      <img src={logo} alt="" width="56" height="56" />
      <p>Cargando el aula…</p>
    </div>
  );
}

export default function App() {
  const { user, loading, waitingProfile } = useAuth();
  const toast = useToast();

  // Avisa si un cambio no se pudo guardar en la nube (por ejemplo, por permisos).
  useEffect(() => onSyncError(toast.error), [toast]);

  if (loading) return <Splash />;
  if (waitingProfile) return <WaitingAccessPage />;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/inicio" replace /> : <LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/inicio" element={<DashboardPage />} />
        <Route path="/repositorio" element={<RepositoryPage />} />
        <Route path="/repositorio/:folderId" element={<RepositoryPage />} />
        <Route path="/temas" element={<TopicsPage />} />
        <Route path="/temas/:topicId" element={<TopicDetailPage />} />
        <Route path="/ejercicios" element={<ExercisesPage />} />
        <Route path="/ejercicios/:exerciseId" element={<ExerciseDetailPage />} />
        <Route path="/pizarra" element={<WhiteboardLobbyPage />} />
        <Route path="/mis-archivos" element={<MyFilesPage />} />
        <Route
          path="/alumnos"
          element={
            <RequireAuth teacherOnly>
              <StudentsPage />
            </RequireAuth>
          }
        />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>

      {/* Pantallas completas: la pizarra necesita todo el espacio disponible */}
      <Route
        path="/pizarra/:sessionId"
        element={
          <RequireAuth>
            <WhiteboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/clases/:classId"
        element={
          <RequireAuth>
            <SavedClassPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
