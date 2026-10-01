import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Search, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../hooks/useStore';
import UserAvatar from '../UserAvatar';

export default function Navbar({ onMenu }) {
  const { user, isTeacher } = useAuth();
  const { sessions } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const liveSession = sessions.find((session) => session.active);

  // Mantiene el buscador sincronizado con la URL (por ejemplo, al limpiar la búsqueda).
  useEffect(() => {
    if (location.pathname.startsWith('/repositorio')) setQuery(params.get('q') ?? '');
  }, [location.pathname, params]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/repositorio?q=${encodeURIComponent(value)}` : '/repositorio');
  };

  return (
    <header className="navbar">
      <button className="icon-btn navbar__menu" onClick={onMenu} aria-label="Abrir menú">
        <Menu size={20} />
      </button>

      <form className="search" onSubmit={handleSubmit} role="search">
        <Search size={18} />
        <input type="search" placeholder="Buscar temas o archivos…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar" />
      </form>

      <div className="navbar__right">
        {liveSession && (
          <Link to={`/pizarra/${liveSession.id}`} className="live-pill" title={liveSession.title}>
            <Radio size={15} />
            <span className="hide-sm">Clase en vivo</span>
          </Link>
        )}
        <Link to="/configuracion" className="navbar__user">
          <span className="navbar__user-text">
            <strong>{user.displayName}</strong>
            <span>{isTeacher ? 'Profesor' : 'Alumno'}</span>
          </span>
          <UserAvatar user={user} size={38} />
        </Link>
      </div>
    </header>
  );
}
