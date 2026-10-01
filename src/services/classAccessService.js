/**
 * Quién puede entrar a cada clase en vivo.
 *
 *  - Alumnos elegidos: la clase es para todos o para algunos alumnos (allowed/{uid}).
 *  - Sala de espera: el alumno pide entrar (lobby/{uid}) y el profesor lo deja pasar (admitted/{uid}).
 *  - Expulsados: banned/{uid}. No pueden volver a entrar hasta que el profesor los readmita.
 *
 * En modo Firebase se guarda en Realtime Database (boards/{sessionId}/...) y las reglas
 * de seguridad lo hacen cumplir. En modo demostración se guarda en el navegador.
 */
import { rtStore } from './rtStore';

export const DEFAULT_ACCESS = { all: true, allowed: [], waiting: true, readOnly: true };

/** El alumno ve la clase si es para todos o si está entre los elegidos. */
export function canSeeSession(session, user) {
  if (!user || user.role === 'teacher') return true;
  const access = session.access;
  return !access || access.all || (access.allowed ?? []).includes(user.id);
}

const store = rtStore;
const base = (sessionId) => `boards/${sessionId}`;
const toList = (value) => Object.entries(value ?? {}).map(([id, data]) => ({ id, ...(typeof data === 'object' ? data : {}) }));

/* ---------- Profesor ---------- */

export function initClassAccess(sessionId, access) {
  const changes = { config: { all: access.all, waiting: access.waiting } };
  if (!access.all) access.allowed.forEach((uid) => (changes[`allowed/${uid}`] = true));
  return store.update(base(sessionId), changes);
}

export const setWaitingRoom = (sessionId, waiting) => store.update(base(sessionId), { 'config/waiting': waiting });

export function admit(sessionId, userIds) {
  const changes = {};
  userIds.forEach((uid) => {
    changes[`admitted/${uid}`] = true;
    changes[`lobby/${uid}`] = null;
  });
  return store.update(base(sessionId), changes);
}

export const rejectEntry = (sessionId, uid) => store.update(base(sessionId), { [`banned/${uid}`]: true, [`lobby/${uid}`]: null });

/** Expulsa a un alumno: no puede volver a entrar y se borra su cursor y presencia. */
export const ban = (sessionId, uid) =>
  store.update(base(sessionId), {
    [`banned/${uid}`]: true,
    [`admitted/${uid}`]: null,
    [`presence/${uid}`]: null,
    [`cursors/${uid}`]: null,
    [`drafts/${uid}`]: null,
    [`call/members/${uid}`]: null,
    [`call/hands/${uid}`]: null,
    [`call/speakers/${uid}`]: null,
  });

export const unban = (sessionId, uid) => store.update(base(sessionId), { [`banned/${uid}`]: null, [`admitted/${uid}`]: true });

export const watchConfig = (sessionId, callback) => store.watch(`${base(sessionId)}/config`, callback);
export const watchLobby = (sessionId, callback) => store.watch(`${base(sessionId)}/lobby`, (value) => callback(toList(value)));
export const watchBanned = (sessionId, callback) => store.watch(`${base(sessionId)}/banned`, (value) => callback(Object.keys(value ?? {})));

/* ---------- Alumno ---------- */

/** Estado de entrada del alumno: { ready, waiting, admitted, banned }. */
export function watchMyEntry(sessionId, uid, callback) {
  const current = { config: undefined, admitted: undefined, banned: undefined };
  const emit = () => {
    const ready = Object.values(current).every((value) => value !== undefined);
    callback({
      ready,
      waiting: current.config?.waiting === true,
      admitted: current.admitted === true,
      banned: current.banned === true,
    });
  };
  const stops = [
    store.watch(`${base(sessionId)}/config`, (value) => ((current.config = value), emit())),
    store.watch(`${base(sessionId)}/admitted/${uid}`, (value) => ((current.admitted = value), emit())),
    store.watch(`${base(sessionId)}/banned/${uid}`, (value) => ((current.banned = value), emit())),
  ];
  return () => stops.forEach((stop) => stop());
}

/** Anota al alumno en la sala de espera. Devuelve una función para salir de la sala. */
export function requestEntry(sessionId, user) {
  const path = `lobby/${user.id}`;
  store.update(base(sessionId), { [path]: { name: user.displayName, color: user.color, at: Date.now() } }).catch(() => {});
  store.removeOnDisconnect(`${base(sessionId)}/${path}`);
  return () => store.update(base(sessionId), { [path]: null }).catch(() => {});
}
