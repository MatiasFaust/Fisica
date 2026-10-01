import { uid } from '../utils/id';

const MAX_ACTIVITY = 60;

/** Devuelve el estado con una nueva entrada de actividad al principio. */
export function withActivity(state, { userId, type, text, link }) {
  const entry = { id: uid('act-'), userId, type, text, link, at: new Date().toISOString() };
  return { ...state, activity: [entry, ...state.activity].slice(0, MAX_ACTIVITY) };
}
