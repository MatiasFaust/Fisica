/**
 * Estado central de la app (carpetas, archivos, ejercicios, clases…).
 *
 * - Modo demostración: se guarda en localStorage y se comparte entre pestañas.
 * - Modo Firebase: se llena desde Firestore en tiempo real y cada cambio se
 *   escribe de vuelta (ver cloudSync.js). Los servicios no notan la diferencia.
 */
import { createSeedData } from './seed';
import { isFirebaseConfigured } from './firebase';
import { COLLECTIONS, listenToCollections, writeDiff } from './cloudSync';

const STORAGE_KEY = 'fisica-db-v1';
const listeners = new Set();
const errorListeners = new Set();

const emptyState = () => ({ ...Object.fromEntries(COLLECTIONS.map((name) => [name, []])), loaded: false });

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* almacenamiento no disponible: se usan datos en memoria */
  }
  return null;
}

let state = isFirebaseConfigured ? emptyState() : { ...(loadLocal() ?? createSeedData()), loaded: true };
if (!isFirebaseConfigured) persistLocal();

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage', error);
    throw new Error('No hay espacio suficiente en el navegador para guardar este cambio.');
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function reportError(error) {
  console.error(error);
  const message = error?.code === 'permission-denied' ? 'No tenés permiso para hacer este cambio.' : 'No se pudo guardar el cambio en la nube.';
  errorListeners.forEach((listener) => listener(message));
}

export function getState() {
  return state;
}

/** Aplica un cambio inmutable: updater recibe el estado actual y devuelve el nuevo. */
export function updateState(updater) {
  const previous = state;
  state = updater(state);
  if (isFirebaseConfigured) {
    writeDiff(previous, state).catch(reportError);
  } else {
    try {
      persistLocal();
    } catch (error) {
      state = previous;
      throw error;
    }
  }
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Avisos cuando falla un guardado en la nube (los muestra la interfaz). */
export function onSyncError(listener) {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

export function resetDatabase() {
  if (isFirebaseConfigured) return;
  state = { ...createSeedData(), loaded: true };
  persistLocal();
  emit();
}

/* ---------- Modo Firebase ---------- */

let stopListening = null;

/** Empieza a escuchar Firestore (se llama al iniciar sesión). */
export function connectCloud() {
  if (!isFirebaseConfigured || stopListening) return;
  const pending = new Set(COLLECTIONS);
  stopListening = listenToCollections(
    (name, docs) => {
      pending.delete(name);
      state = { ...state, [name]: docs, loaded: pending.size === 0 };
      emit();
    },
    reportError,
  );
}

export function disconnectCloud() {
  stopListening?.();
  stopListening = null;
  state = emptyState();
  emit();
}

if (!isFirebaseConfigured) {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    state = { ...JSON.parse(event.newValue), loaded: true };
    emit();
  });
}
