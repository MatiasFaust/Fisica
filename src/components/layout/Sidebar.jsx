import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, BookOpen, ClipboardList, PenLine, Files, Users, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../hooks/useStore';
import UserAvatar from '../UserAvatar';
import { getPendingStudents } from '../../services/studentService';
import { canSeeSession } from '../../services/classAccessService';
import logo from '../../assets/logo.svg';

const NAV_ITEMS = [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/repositorio', label: 'Repositorio', icon: FolderOpen },
  { to: '/temas', label: 'Temas', icon: BookOpen },
  { to: '/ejercicios', label: 'Ejercicios', icon: ClipboardList },
  { to: '/pizarra', label: 'Pizarra en vivo', icon: PenLine, live: true },
  { to: '/mis-archivos', label: 'Mis archivos', icon: Files },
  { to: '/alumnos', label: 'Alumnos', icon: Users, teacherOnly: true, requests: true },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user, isTeacher, logout } = useAuth();
  const state = useStore();
  const navigate = useNavigate();
  const liveCount = state.sessions.filter((session) => session.active && canSeeSession(session, user)).length;
  const pendingCount = isTeacher ? getPendingStudents(state).length : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'is-visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <img src={logo} alt="" width="36" height="36" />
          <div>
            <strong>Física</strong>
            <span>Nicolas Laviano</span>
          </div>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.filter((item) => !item.teacherOnly || isTeacher).map(({ to, label, icon: Icon, live, requests }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`} onClick={onClose}>
              <Icon size={19} />
              <span>{label}</span>
              {live && liveCount > 0 && <span className="sidebar__live">EN VIVO</span>}
              {requests && pendingCount > 0 && (
                <span className="sidebar__badge" title="Solicitudes pendientes">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <UserAvatar user={user} size={36} />
            <div>
              <strong>{user.displayName}</strong>
              <span>{isTeacher ? 'Profesor · Física' : 'Alumno · Física'}</span>
            </div>
          </div>
          <button className="sidebar__link sidebar__logout" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
