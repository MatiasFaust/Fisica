/**
 * Videollamada propia de cada clase (WebRTC). Acá solo viaja la "señalización":
 * quién está en la llamada, quién transmite y los mensajes para conectar los navegadores.
 * El audio y el video van directo de navegador a navegador.
 *
 * boards/{sessionId}/call/
 *   live              { by, at }         el profesor está transmitiendo
 *   members/{uid}     { name, role, color, at }
 *   hands/{uid}       momento en que levantó la mano
 *   speakers/{uid}    true: el profesor le dio la palabra
 *   signals/{to}/{k}  { from, kind, data } mensajes de conexión para "to"
 */
import { rtStore } from './rtStore';

const base = (sessionId) => `boards/${sessionId}/call`;

/** Servidores para que los navegadores se encuentren. Se puede sumar un TURN propio en .env. */
export function iceServers() {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const turnUrls = import.meta.env.VITE_TURN_URLS;
  if (turnUrls) {
    servers.push({
      urls: turnUrls.split(',').map((url) => url.trim()),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

/** Estado de la llamada: { live, members, hands, speakers }. */
export function watchCall(sessionId, callback) {
  const current = { live: null, members: {}, hands: {}, speakers: {} };
  const watch = (key) =>
    rtStore.watch(`${base(sessionId)}/${key}`, (value) => {
      current[key] = key === 'live' ? value : (value ?? {});
      callback({ ...current });
    });
  const stops = ['live', 'members', 'hands', 'speakers'].map(watch);
  return () => stops.forEach((stop) => stop());
}

export function joinCall(sessionId, user) {
  const path = `members/${user.id}`;
  rtStore.removeOnDisconnect(`${base(sessionId)}/${path}`);
  rtStore.removeOnDisconnect(`${base(sessionId)}/hands/${user.id}`);
  return rtStore.update(base(sessionId), {
    [path]: { name: user.displayName ?? user.name, role: user.role, color: user.color ?? '#2563eb', at: Date.now() },
    // Mensajes viejos de una conexión anterior: se descartan.
    [`signals/${user.id}`]: null,
  });
}

export const leaveCall = (sessionId, userId) =>
  rtStore.update(base(sessionId), { [`members/${userId}`]: null, [`hands/${userId}`]: null }).catch(() => {});

/** El profesor empieza o termina la transmisión. */
export function setLive(sessionId, user, live) {
  if (live) rtStore.removeOnDisconnect(`${base(sessionId)}/live`);
  return rtStore.update(base(sessionId), { live: live ? { by: user.id, at: Date.now() } : null });
}

export const setHand = (sessionId, userId, raised) => rtStore.update(base(sessionId), { [`hands/${userId}`]: raised ? Date.now() : null });

/** El profesor da o quita la palabra (y se baja la mano). */
export const setSpeaker = (sessionId, userId, speaking) =>
  rtStore.update(base(sessionId), { [`speakers/${userId}`]: speaking ? true : null, [`hands/${userId}`]: null });

export function sendSignal(sessionId, from, to, kind, data) {
  const key = rtStore.newKey(`${base(sessionId)}/signals/${to}`);
  return rtStore.update(base(sessionId), { [`signals/${to}/${key}`]: { from, kind, data: JSON.stringify(data) } });
}

/** Mensajes recibidos, en orden de llegada: [{ key, from, kind, data }]. */
export const watchInbox = (sessionId, userId, callback) =>
  rtStore.watch(`${base(sessionId)}/signals/${userId}`, (value) =>
    callback(
      Object.entries(value ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, message]) => ({ key, ...message, data: JSON.parse(message.data) })),
    ),
  );

export function clearSignals(sessionId, userId, keys) {
  if (!keys.length) return Promise.resolve();
  const changes = Object.fromEntries(keys.map((key) => [`signals/${userId}/${key}`, null]));
  return rtStore.update(base(sessionId), changes).catch(() => {});
}
