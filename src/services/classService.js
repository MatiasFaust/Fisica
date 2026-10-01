/** Clases en vivo (sesiones de pizarra) y clases guardadas. */
import { updateState } from './store';
import { withActivity } from './activityService';
import { deleteBoard, sendBoardOp } from './realtimeService';
import { DEFAULT_ACCESS, initClassAccess } from './classAccessService';
import { uid } from '../utils/id';

/**
 * access: { all, allowed: [uid], waiting, readOnly }
 *  - all / allowed: para quiénes es la clase
 *  - waiting: los alumnos esperan a que el profesor los deje pasar
 *  - readOnly: entran solo mirando (el profesor les da permiso para escribir)
 */
export async function createSession({ title, topicId, access = DEFAULT_ACCESS }, user) {
  const session = {
    id: uid('clase-'),
    title: title.trim(),
    topicId: topicId || null,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    active: true,
    access: { all: access.all, allowed: access.all ? [] : access.allowed, waiting: access.waiting, readOnly: access.readOnly },
  };
  await initClassAccess(session.id, access);
  if (access.readOnly) await sendBoardOp(session.id, { type: 'lockAll', locked: true }, user);
  updateState((state) =>
    withActivity(
      { ...state, sessions: [session, ...state.sessions] },
      { userId: user.id, type: 'class', text: `inició la clase en vivo «${session.title}»`, link: `/pizarra/${session.id}` },
    ),
  );
  return session;
}

export async function endSession(sessionId) {
  updateState((state) => ({
    ...state,
    sessions: state.sessions.map((session) => (session.id === sessionId ? { ...session, active: false, endedAt: new Date().toISOString() } : session)),
  }));
}

export async function reopenSession(sessionId) {
  updateState((state) => ({
    ...state,
    sessions: state.sessions.map((session) => (session.id === sessionId ? { ...session, active: true } : session)),
  }));
}

export async function deleteSession(sessionId) {
  updateState((state) => ({ ...state, sessions: state.sessions.filter((session) => session.id !== sessionId) }));
  await deleteBoard(sessionId).catch(() => {});
}

/** Guarda una copia de la pizarra en "Repositorio > Clases guardadas". */
export async function saveClass({ sessionId, title, topicId, pages }, user) {
  const withContent = pages.filter((page) => page.objects.length > 0);
  const saved = {
    id: uid('saved-'),
    title: title.trim(),
    topicId: topicId || null,
    sessionId,
    savedAt: new Date().toISOString(),
    ownerId: user.id,
    pages: withContent.length ? withContent : pages.slice(0, 1),
  };
  updateState((state) =>
    withActivity(
      { ...state, savedClasses: [saved, ...state.savedClasses] },
      { userId: user.id, type: 'class', text: `guardó la clase «${saved.title}»`, link: `/clases/${saved.id}` },
    ),
  );
  return saved;
}

export async function renameSavedClass(classId, title) {
  updateState((state) => ({
    ...state,
    savedClasses: state.savedClasses.map((item) => (item.id === classId ? { ...item, title: title.trim() } : item)),
  }));
}

export async function deleteSavedClass(classId) {
  updateState((state) => ({ ...state, savedClasses: state.savedClasses.filter((item) => item.id !== classId) }));
}
