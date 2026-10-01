/**
 * Contenido binario de los archivos subidos.
 *  - Modo demostración: IndexedDB del navegador.
 *  - Modo Firebase: Firebase Storage (carpeta files/).
 */
import { deleteObject, getBlob as getStorageBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { isFirebaseConfigured, storage } from './firebase';

const DB_NAME = 'fisica-files';
const STORE = 'blobs';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
  });
}

const storageRef = (id) => ref(storage, `files/${id}`);

/** Guarda el archivo. En Firebase devuelve { url } para guardarlo en el registro del archivo. */
export async function putBlob(id, blob) {
  if (!isFirebaseConfigured) {
    await run('readwrite', (store) => store.put(blob, id));
    return {};
  }
  await uploadBytes(storageRef(id), blob, { contentType: blob.type || undefined });
  return { url: await getDownloadURL(storageRef(id)) };
}

export function getBlob(id) {
  if (!isFirebaseConfigured) return run('readonly', (store) => store.get(id));
  return getStorageBlob(storageRef(id));
}

export function deleteBlob(id) {
  if (!isFirebaseConfigured) return run('readwrite', (store) => store.delete(id));
  return deleteObject(storageRef(id));
}
