/**
 * Tiempo real de la pizarra.
 *
 *  - Modo demostración: BroadcastChannel entre pestañas del mismo navegador.
 *  - Modo Firebase: Realtime Database en boards/{sessionId}:
 *      ops/       lista de operaciones (el dibujo se reconstruye aplicándolas en orden)
 *      presence/  quién está conectado (se borra solo al desconectarse)
 *      cursors/   posición del cursor de cada uno
 *      drafts/    trazo que alguien está dibujando en este momento
 *
 * Las dos versiones devuelven la misma interfaz, así la pizarra no cambia.
 */
import {
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database';
import { isFirebaseConfigured, rtdb } from './firebase';
import { applyOp, canDraw, createEmptyBoard, DRAWING_OPS, loadBoardState, saveBoardState } from './boardOps';

const HEARTBEAT_MS = 2500;

/** Una operación solo se aplica si su autor tiene permiso para hacerla. */
function isAllowed(board, op, author) {
  if (DRAWING_OPS.has(op.type)) return canDraw(board, author);
  return author?.role === 'teacher';
}

const toMe = (user) => ({ id: user.id, name: user.displayName, color: user.color, role: user.role });

export function connectToBoard(sessionId, user, handlers) {
  return isFirebaseConfigured ? connectCloud(sessionId, user, handlers) : connectDemo(sessionId, user, handlers);
}

/** Envía una operación sin estar dentro de la pizarra (por ejemplo, terminar la clase desde la lista). */
export function sendBoardOp(sessionId, op, user) {
  const author = toMe(user);
  if (isFirebaseConfigured) {
    return push(ref(rtdb, `boards/${sessionId}/ops`), { op: JSON.stringify(op), author: JSON.stringify(author) });
  }
  saveBoardState(sessionId, applyOp(loadBoardState(sessionId), op));
  const channel = new BroadcastChannel(`fisica-board-${sessionId}`);
  channel.postMessage({ kind: 'op', op, author, from: author.id });
  channel.close();
  return Promise.resolve();
}

export function deleteBoard(sessionId) {
  if (isFirebaseConfigured) return remove(ref(rtdb, `boards/${sessionId}`));
  localStorage.removeItem(`fisica-board-${sessionId}`);
  return Promise.resolve();
}

/* ---------- Modo demostración ---------- */

function connectDemo(sessionId, user, handlers) {
  const channel = new BroadcastChannel(`fisica-board-${sessionId}`);
  const me = toMe(user);
  let board = loadBoardState(sessionId);
  let closed = false;

  const post = (message) => {
    if (!closed) channel.postMessage({ ...message, from: me.id });
  };
  const announce = (hello = false) => post({ kind: 'presence', user: me, hello });

  channel.onmessage = ({ data }) => {
    switch (data.kind) {
      case 'op':
        if (!isAllowed(board, data.op, data.author)) return;
        board = applyOp(board, data.op);
        handlers.onBoard?.(board, data.op, data.author);
        break;
      case 'presence':
        handlers.onPresence?.(data.user);
        if (data.hello) announce();
        break;
      case 'leave':
        handlers.onLeave?.(data.from);
        break;
      case 'cursor':
        handlers.onCursor?.(data.from, data.cursor);
        break;
      case 'draft':
        handlers.onDraft?.(data.from, data.draft);
        break;
      default:
        break;
    }
  };

  announce(true);
  const heartbeat = setInterval(() => announce(), HEARTBEAT_MS);
  const handleUnload = () => post({ kind: 'leave' });
  window.addEventListener('beforeunload', handleUnload);

  return {
    getBoard: () => board,
    sendOp(op) {
      board = applyOp(board, op);
      try {
        saveBoardState(sessionId, board);
      } catch {
        handlers.onError?.('No hay espacio suficiente para guardar la pizarra en este navegador.');
      }
      post({ kind: 'op', op, author: me });
      handlers.onBoard?.(board, op, me);
    },
    sendCursor: (cursor) => post({ kind: 'cursor', cursor }),
    sendDraft: (draft) => post({ kind: 'draft', draft }),
    disconnect() {
      post({ kind: 'leave' });
      closed = true;
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      channel.close();
    },
  };
}

/* ---------- Modo Firebase (Realtime Database) ---------- */

function connectCloud(sessionId, user, handlers) {
  const base = `boards/${sessionId}`;
  const me = toMe(user);
  let board = createEmptyBoard();
  const ownOps = new Set();
  const present = new Map();
  const unsubscribers = [];

  const presenceRef = ref(rtdb, `${base}/presence/${me.id}`);
  const cursorRef = ref(rtdb, `${base}/cursors/${me.id}`);
  const draftRef = ref(rtdb, `${base}/drafts/${me.id}`);
  // Si se corta la conexión, Firebase borra estos datos automáticamente.
  [presenceRef, cursorRef, draftRef].forEach((item) => onDisconnect(item).remove());
  set(presenceRef, { ...me, at: serverTimestamp() });

  unsubscribers.push(
    onChildAdded(ref(rtdb, `${base}/ops`), (snapshot) => {
      if (ownOps.has(snapshot.key)) return;
      const op = JSON.parse(snapshot.val().op);
      const author = JSON.parse(snapshot.val().author);
      if (!isAllowed(board, op, author)) return;
      board = applyOp(board, op);
      handlers.onBoard?.(board, op, author);
    }),
  );

  unsubscribers.push(
    onValue(ref(rtdb, `${base}/presence`), (snapshot) => {
      const current = snapshot.val() ?? {};
      present.forEach((_, id) => !current[id] && handlers.onLeave?.(id));
      present.clear();
      Object.values(current).forEach((participant) => {
        present.set(participant.id, participant);
        handlers.onPresence?.(participant);
      });
    }),
  );
  // La pizarra descarta participantes que no "dan señales": se reenvía la lista periódicamente.
  const heartbeat = setInterval(() => present.forEach((participant) => handlers.onPresence?.(participant)), HEARTBEAT_MS);

  const listenEphemeral = (path, handler) => {
    const target = ref(rtdb, `${base}/${path}`);
    const update = (snapshot) => snapshot.key !== me.id && handler(snapshot.key, JSON.parse(snapshot.val()));
    unsubscribers.push(onChildAdded(target, update), onChildChanged(target, update));
    unsubscribers.push(onChildRemoved(target, (snapshot) => snapshot.key !== me.id && handler(snapshot.key, null)));
  };
  listenEphemeral('cursors', (id, cursor) => cursor && handlers.onCursor?.(id, cursor));
  listenEphemeral('drafts', (id, draft) => handlers.onDraft?.(id, draft));

  return {
    getBoard: () => board,
    sendOp(op) {
      board = applyOp(board, op);
      handlers.onBoard?.(board, op, me);
      const opRef = push(ref(rtdb, `${base}/ops`));
      ownOps.add(opRef.key);
      set(opRef, { op: JSON.stringify(op), author: JSON.stringify(me), at: serverTimestamp() }).catch(() =>
        handlers.onError?.('No se pudo enviar el cambio a la pizarra. Revisá la conexión.'),
      );
    },
    sendCursor: (cursor) => set(cursorRef, JSON.stringify(cursor)).catch(() => {}),
    sendDraft: (draft) => (draft ? set(draftRef, JSON.stringify(draft)) : remove(draftRef)).catch(() => {}),
    disconnect() {
      clearInterval(heartbeat);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      [presenceRef, cursorRef, draftRef].forEach((item) => remove(item).catch(() => {}));
    },
  };
}
