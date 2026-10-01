import { Clock, ShieldX, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Lo que ve un alumno con cuenta creada que todavía no tiene acceso al curso. */
export default function WaitingAccessPage() {
  const { waitingProfile, logout } = useAuth();
  const blocked = waitingProfile.status === 'blocked';

  return (
    <div className="board-message">
      <div className="board-message__card">
        <span className={`board-message__icon ${blocked ? 'board-message__icon--danger' : ''}`}>{blocked ? <ShieldX size={28} /> : <Clock size={28} />}</span>
        <h1>{blocked ? 'No tenés acceso al curso' : `¡Listo, ${waitingProfile.name}!`}</h1>
        <p>
          {blocked
            ? 'El profesor no habilitó esta cuenta. Si creés que es un error, hablá con él.'
            : 'Tu cuenta está creada. Cuando el profesor la apruebe, esta pantalla se va a actualizar sola y vas a poder entrar.'}
        </p>
        <p className="muted waiting__email">{waitingProfile.email}</p>
        <button className="btn btn--ghost" onClick={logout}>
          <LogOut size={17} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
