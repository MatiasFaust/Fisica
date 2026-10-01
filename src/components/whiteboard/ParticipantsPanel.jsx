import { Lock, LockOpen, UserX, X, PenLine, PenOff, UserCheck } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { canDraw } from '../../services/boardOps';

/** Panel del profesor: quién está conectado y qué puede hacer cada alumno. */
export default function ParticipantsPanel({ open, participants, board, users, onClose, onTogglePermission, onKick, onReadmit, onLockAll }) {
  const kicked = users.filter((user) => board.kicked?.includes(user.id));

  return (
    <aside className={`wb-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header className="wb-panel__header">
        <h3>Participantes ({participants.length})</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
          <X size={18} />
        </button>
      </header>

      <div className="wb-panel__actions">
        <button className="btn btn--soft btn--sm" onClick={() => onLockAll(true)}>
          <Lock size={15} /> Bloquear a todos
        </button>
        <button className="btn btn--soft btn--sm" onClick={() => onLockAll(false)}>
          <LockOpen size={15} /> Permitir a todos
        </button>
      </div>

      <ul className="wb-panel__list">
        {participants.map((participant) => {
          const isStudent = participant.role !== 'teacher';
          const allowed = canDraw(board, participant);
          return (
            <li key={participant.id} className="wb-participant">
              <UserAvatar user={{ ...participant, displayName: participant.name }} size={34} online />
              <div className="wb-participant__info">
                <strong>{participant.name}</strong>
                <span>{isStudent ? (allowed ? 'Puede escribir' : 'Solo mira') : 'Profesor'}</span>
              </div>
              {isStudent && (
                <div className="wb-participant__actions">
                  <button
                    className={`icon-btn ${allowed ? '' : 'icon-btn--warning'}`}
                    onClick={() => onTogglePermission(participant.id, !allowed)}
                    title={allowed ? 'Bloquear escritura' : 'Permitir escritura'}
                    aria-label={allowed ? 'Bloquear escritura' : 'Permitir escritura'}
                  >
                    {allowed ? <PenLine size={17} /> : <PenOff size={17} />}
                  </button>
                  <button className="icon-btn icon-btn--danger" onClick={() => onKick(participant)} title="Expulsar de la clase" aria-label="Expulsar de la clase">
                    <UserX size={17} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {kicked.length > 0 && (
        <>
          <p className="wb-panel__subtitle">Expulsados</p>
          <ul className="wb-panel__list">
            {kicked.map((user) => (
              <li key={user.id} className="wb-participant is-muted">
                <UserAvatar user={user} size={30} />
                <div className="wb-participant__info">
                  <strong>{user.displayName}</strong>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => onReadmit(user.id)}>
                  <UserCheck size={15} /> Readmitir
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
