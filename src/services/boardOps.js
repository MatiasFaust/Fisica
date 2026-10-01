/**
 * Modelo de datos de la pizarra.
 *
 * Una pizarra tiene hojas (pages) y cada hoja una lista de objetos
 * (trazos, formas, textos, imágenes, tarjetas). Todos los cambios se expresan
 * como "operaciones" pequeñas que se envían a los demás participantes;
 * cada uno aplica la misma operación y así todos ven lo mismo.
 */

const boardKey = (sessionId) => `fisica-board-${sessionId}`;

/** Operaciones que modifican el dibujo (las que se bloquean a alumnos sin permiso). */
export const DRAWING_OPS = new Set(['add', 'remove']);

// La primera hoja tiene un id fijo para que todos los participantes la compartan.
export function createEmptyBoard() {
  return { pages: [{ id: 'page-1', objects: [] }], locked: false, permissions: {}, kicked: [], ended: false };
}

export function loadBoardState(sessionId) {
  try {
    const raw = localStorage.getItem(boardKey(sessionId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* sin datos guardados */
  }
  return createEmptyBoard();
}

export function saveBoardState(sessionId, board) {
  localStorage.setItem(boardKey(sessionId), JSON.stringify(board));
}

export function canDraw(board, user) {
  if (!user) return false;
  if (user.role === 'teacher') return true;
  if (board.kicked?.includes(user.id)) return false;
  return board.permissions?.[user.id] ?? !board.locked;
}

const mapPage = (board, pageId, fn) => ({
  ...board,
  pages: board.pages.map((page) => (page.id === pageId ? { ...page, objects: fn(page.objects) } : page)),
});

/** Aplica una operación y devuelve una pizarra nueva (no muta la anterior). */
export function applyOp(board, op) {
  switch (op.type) {
    case 'add':
      return mapPage(board, op.pageId, (objects) => {
        const ids = new Set(objects.map((item) => item.id));
        return [...objects, ...op.objects.filter((item) => !ids.has(item.id))];
      });
    case 'remove': {
      const ids = new Set(op.ids);
      return mapPage(board, op.pageId, (objects) => objects.filter((item) => !ids.has(item.id)));
    }
    case 'clear':
      return mapPage(board, op.pageId, () => []);
    case 'addPage':
      if (board.pages.some((page) => page.id === op.pageId)) return board;
      return { ...board, pages: [...board.pages, { id: op.pageId, objects: [] }] };
    case 'removePage':
      if (board.pages.length <= 1) return board;
      return { ...board, pages: board.pages.filter((page) => page.id !== op.pageId) };
    case 'lockAll':
      return { ...board, locked: op.locked, permissions: {} };
    case 'permission':
      return { ...board, permissions: { ...board.permissions, [op.userId]: op.allowed } };
    case 'kick':
      return { ...board, kicked: [...new Set([...(board.kicked || []), op.userId])] };
    case 'unkick':
      return { ...board, kicked: (board.kicked || []).filter((id) => id !== op.userId) };
    case 'end':
      return { ...board, ended: op.ended };
    default:
      return board;
  }
}
