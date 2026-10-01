/**
 * Sincronización del estado de la app con Firestore.
 *  - Lectura: escucha cada colección con onSnapshot (cambios en tiempo real).
 *  - Escritura: compara el estado anterior con el nuevo y guarda solo los
 *    documentos que cambiaron, en un único lote (writeBatch).
 */
import { collection, doc,limit, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export const COLLECTIONS = ['users', 'folders', 'topics', 'files', 'exercises', 'submissions', 'sessions', 'savedClasses', 'activity'];
const ACTIVITY_LIMIT = 60;

// Firestore no admite arrays dentro de arrays (los trazos de la pizarra los usan),
// así que las hojas de las clases guardadas se guardan como texto JSON.
const serialize = (name, item) => (name === 'savedClasses' ? { ...item, pages: JSON.stringify(item.pages) } : item);
const deserialize = (name, data) => (name === 'savedClasses' && typeof data.pages === 'string' ? { ...data, pages: JSON.parse(data.pages) } : data);

/** Escucha todas las colecciones. onChange(nombre, documentos). Devuelve la función para dejar de escuchar. */
export function listenToCollections(onChange, onError) {
  const unsubscribers = COLLECTIONS.map((name) => {
    const source = name === 'activity' ? query(collection(db, name), orderBy('at', 'desc'), limit(ACTIVITY_LIMIT)) : collection(db, name);
    return onSnapshot(
      source,
      (snapshot) => onChange(name, snapshot.docs.map((d) => deserialize(name, { ...d.data(), id: d.id }))),
      (error) => onError?.(error),
    );
  });
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/** Guarda en Firestore las diferencias entre dos estados. */
export function writeDiff(previous, next) {
  const batch = writeBatch(db);
  let changes = 0;

  COLLECTIONS.forEach((name) => {
    const before = previous[name] ?? [];
    const after = next[name] ?? [];
    if (before === after) return;

    const beforeById = new Map(before.map((item) => [item.id, item]));
    const afterIds = new Set();
    after.forEach((item) => {
      afterIds.add(item.id);
      // Los servicios conservan la misma referencia en los objetos que no cambian.
      if (beforeById.get(item.id) !== item) {
        const { id, ...data } = serialize(name, item);
        batch.set(doc(db, name, id), data);
        changes += 1;
      }
    });
    // La actividad vieja se recorta solo en pantalla; no se borra de la base.
    if (name === 'activity') return;
    before.forEach((item) => {
      if (!afterIds.has(item.id)) {
        batch.delete(doc(db, name, item.id));
        changes += 1;
      }
    });
  });

  return changes ? batch.commit() : Promise.resolve();
}
