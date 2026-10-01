import { Lock, LockOpen, UserX, X, PenLine, PenOff, UserCheck, DoorClosed, Check } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { canDraw } from '../../services/boardOps';

/** Panel del profesor: sala de espera, quién está conectado y qué puede hacer cada alumno. */
export default function ParticipantsPanel({
  open,
  participants,
  board,
  waiting = [],
  bannedUsers = [],
  waitingRoom,
  onToggleWaitingRoom,
  onAdmit,
  onReject,
  onClose,
  onTogglePermission,
  onKick,
  onReadmit,
  onLockAll,
}) {
  return (
    <aside className={`wb-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <header className="wb-panel__header">
        <h3>Participantes ({participants.length})</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar panel">
          <X size={18} />
        </button>
      </header>

      <label className="wb-panel__toggle">
        <DoorClosed size={17} />
        <span>Sala de espera</span>
        <input type="checkbox" className="switch" checked={waitingRoom} onChange={(event) => onToggleWaitingRoom(event.target.checked)} />
      </label>

      {waiting.length > 0 && (
        <section className="wb-panel__waiting">
          <div className="wb-panel__waiting-head">
            <p className="wb-panel__subtitle">Esperando para entrar ({waiting.length})</p>
            {waiting.length > 1 && (
              <button className="btn btn--primary btn--sm" onClick={() => onAdmit(waiting.map((person) => person.id))}>
                Dejar pasar a todos
              </button>
            )}
          </div>
          <ul className="wb-panel__list">
            {waiting.map((person) => (
              <li key={person.id} className="wb-participant is-waiting">
                <UserAvatar user={{ ...person, displayName: person.name }} size={34} />
                <div className="wb-participant__info">
                  <strong>{person.name}</strong>
                  <span>Quiere entrar</span>
                </div>
                <div className="wb-participant__actions">
                  <button className="icon-btn icon-btn--danger" onClick={() => onReject(person.id)} title="Rechazar" aria-label="Rechazar">
                    <X size={17} />
                  </button>
                  <button className="icon-btn icon-btn--success" onClick={() => onAdmit([person.id])} title="Dejar pasar" aria-label="Dejar pasar">
                    <Check size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="wb-panel__actions">
        <button className="btn btn--soft btn--sm" onClick={() => onLockAll(true)}>
          <Lock size={15} /> Solo mirar (todos)
        </button>
        <button className="btn btn--soft btn--sm" onClick={() => onLockAll(false)}>
          <LockOpen size={15} /> Todos escriben
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
                    title={allowed ? 'Quitar permiso para escribir' : 'Dar permiso para escribir'}
                    aria-label={allowed ? 'Quitar permiso para escribir' : 'Dar permiso para escribir'}
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

      {bannedUsers.length > 0 && (
        <>
          <p className="wb-panel__subtitle">Sin acceso a esta clase</p>
          <ul className="wb-panel__list">
            {bannedUsers.map((user) => (
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
