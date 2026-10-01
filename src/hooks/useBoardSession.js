import { useCallback, useEffect, useRef, useState } from 'react';
import { connectToBoard } from '../services/realtimeService';
import { loadBoardState } from '../services/boardOps';

const PRESENCE_TIMEOUT = 8000;

/**
 * Conexión a una pizarra compartida: estado, participantes, cursores remotos
 * y deshacer/rehacer de las acciones propias.
 */
export function useBoardSession(sessionId, user, { enabled = true, onOp, onRemoteActivity, onError } = {}) {
  const [board, setBoard] = useState(() => loadBoardState(sessionId));
  const [participants, setParticipants] = useState([]);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const remoteRef = useRef({ cursors: new Map(), drafts: new Map() });
  const connection = useRef(null);
  const history = useRef({ undo: [], redo: [] });
  const callbacks = useRef({});
  callbacks.current = { onOp, onRemoteActivity, onError };
  const userRef = useRef(user);
  userRef.current = user;
  const userId = user.id;

  useEffect(() => {
    if (!enabled) return undefined;
    const user = userRef.current;
    const presence = new Map();
    const remote = remoteRef.current;
    const self = { id: user.id, name: user.displayName, color: user.color, role: user.role };

    const syncPresence = () => {
      const list = [self, ...[...presence.values()].filter((item) => item.id !== self.id)];
      list.sort((a, b) => (a.role === 'teacher' ? -1 : b.role === 'teacher' ? 1 : a.name.localeCompare(b.name)));
      setParticipants(list);
    };
    const forget = (id) => {
      presence.delete(id);
      remote.cursors.delete(id);
      remote.drafts.delete(id);
      syncPresence();
      callbacks.current.onRemoteActivity?.();
    };

    const conn = connectToBoard(sessionId, user, {
      onBoard: (next, op, author) => {
        setBoard(next);
        if (author?.id !== user.id) remote.drafts.delete(author?.id);
        callbacks.current.onOp?.(op, author);
      },
      onPresence: (participant) => {
        presence.set(participant.id, { ...participant, lastSeen: Date.now() });
        syncPresence();
      },
      onLeave: forget,
      onCursor: (id, cursor) => {
        remote.cursors.set(id, { ...cursor, at: Date.now() });
        callbacks.current.onRemoteActivity?.();
      },
      onDraft: (id, draft) => {
        if (draft) remote.drafts.set(id, draft);
        else remote.drafts.delete(id);
        callbacks.current.onRemoteActivity?.();
      },
      onError: (message) => callbacks.current.onError?.(message),
    });

    connection.current = conn;
    setBoard(conn.getBoard());
    syncPresence();

    const prune = setInterval(() => {
      const now = Date.now();
      presence.forEach((item, id) => now - item.lastSeen > PRESENCE_TIMEOUT && forget(id));
      callbacks.current.onRemoteActivity?.();
    }, 2000);

    return () => {
      clearInterval(prune);
      conn.disconnect();
      connection.current = null;
      remote.cursors.clear();
      remote.drafts.clear();
    };
  }, [sessionId, userId, enabled]);

  const send = useCallback((op) => connection.current?.sendOp(op), []);

  const record = (entry) => {
    history.current.undo.push(entry);
    history.current.redo = [];
    setHistorySize({ undo: history.current.undo.length, redo: 0 });
  };
  const syncHistory = () => setHistorySize({ undo: history.current.undo.length, redo: history.current.redo.length });

  const addObjects = useCallback((pageId, objects) => {
    send({ type: 'add', pageId, objects });
    record({ type: 'add', pageId, objects });
  }, [send]);

  const clearPage = useCallback((pageId) => {
    const page = connection.current?.getBoard().pages.find((item) => item.id === pageId);
    if (!page?.objects.length) return;
    send({ type: 'clear', pageId });
    record({ type: 'clear', pageId, objects: page.objects });
  }, [send]);

  const undo = useCallback(() => {
    const entry = history.current.undo.pop();
    if (!entry) return;
    if (entry.type === 'add') send({ type: 'remove', pageId: entry.pageId, ids: entry.objects.map((obj) => obj.id) });
    else send({ type: 'add', pageId: entry.pageId, objects: entry.objects });
    history.current.redo.push(entry);
    syncHistory();
  }, [send]);

  const redo = useCallback(() => {
    const entry = history.current.redo.pop();
    if (!entry) return;
    if (entry.type === 'add') send({ type: 'add', pageId: entry.pageId, objects: entry.objects });
    else send({ type: 'clear', pageId: entry.pageId });
    history.current.undo.push(entry);
    syncHistory();
  }, [send]);

  return {
    board,
    participants,
    remoteRef,
    send,
    addObjects,
    clearPage,
    undo,
    redo,
    canUndo: historySize.undo > 0,
    canRedo: historySize.redo > 0,
    sendCursor: useCallback((cursor) => connection.current?.sendCursor(cursor), []),
    sendDraft: useCallback((draft) => connection.current?.sendDraft(draft), []),
  };
}
