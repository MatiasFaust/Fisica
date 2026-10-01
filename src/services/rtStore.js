/**
 * Datos en tiempo real de las clases (sala de espera, videollamada).
 *  - Modo Firebase: Realtime Database.
 *  - Modo demostración: localStorage, compartido entre pestañas del mismo navegador.
 * Las rutas son iguales en los dos modos (por ejemplo "boards/{id}/call/members").
 */
import { onDisconnect, onValue, push, ref, update } from 'firebase/database';
import { isFirebaseConfigured, rtdb } from './firebase';

/* ---------- Firebase ---------- */

const cloudStore = {
  watch: (path, callback) =>
    onValue(
      ref(rtdb, path),
      (snapshot) => callback(snapshot.val()),
      () => callback(null),
    ),
  update: (base, changes) => update(ref(rtdb, base), changes),
  newKey: (path) => push(ref(rtdb, path)).key,
  removeOnDisconnect: (path) => onDisconnect(ref(rtdb, path)).remove().catch(() => {}),
  cancelOnDisconnect: (path) => onDisconnect(ref(rtdb, path)).cancel().catch(() => {}),
};

/* ---------- Modo demostración ---------- */

const DEMO_KEY = 'fisica-class-access';
const listeners = new Set();
const removeOnUnload = new Set();
let keyCounter = 0;

const readTree = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY)) ?? {};
  } catch {
    return {};
  }
};
const getAt = (tree, path) => path.split('/').reduce((node, key) => (node == null ? node : node[key]), tree) ?? null;
function setAt(tree, path, value) {
  const keys = path.split('/');
  let node = tree;
  keys.slice(0, -1).forEach((key) => {
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  });
  if (value === null) delete node[keys.at(-1)];
  else node[keys.at(-1)] = value;
}
function notify() {
  const tree = readTree();
  listeners.forEach((listener) => {
    const value = getAt(tree, listener.path);
    const json = JSON.stringify(value);
    if (json === listener.last) return;
    listener.last = json;
    listener.callback(value);
  });
}

const demoStore = {
  watch(path, callback) {
    const value = getAt(readTree(), path);
    const listener = { path, callback, last: JSON.stringify(value) };
    listeners.add(listener);
    callback(value);
    return () => listeners.delete(listener);
  },
  update(base, changes) {
    const tree = readTree();
    Object.entries(changes).forEach(([path, value]) => setAt(tree, `${base}/${path}`, value ?? null));
    localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
    notify();
    return Promise.resolve();
  },
  // Claves ordenadas por tiempo, como las de Firebase.
  newKey: () => `${Date.now().toString(36).padStart(9, '0')}${(keyCounter++).toString(36).padStart(4, '0')}`,
  removeOnDisconnect: (path) => removeOnUnload.add(path),
  cancelOnDisconnect: (path) => removeOnUnload.delete(path),
};

if (!isFirebaseConfigured) {
  window.addEventListener('storage', (event) => event.key === DEMO_KEY && notify());
  window.addEventListener('pagehide', () => {
    if (!removeOnUnload.size) return;
    const tree = readTree();
    removeOnUnload.forEach((path) => setAt(tree, path, null));
    localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
  });
}

export const rtStore = isFirebaseConfigured ? cloudStore : demoStore;
