/**
 * Repositorio: carpetas, archivos y temas.
 * Todas las funciones son async para que la migración a Firebase
 * (Firestore + Storage) no cambie la forma en que las usan las páginas.
 */
import { getState, updateState } from './store';
import { withActivity } from './activityService';
import { putBlob, getBlob, deleteBlob } from './fileStorage';
import { createSamplePdf } from './samplePdf';
import { uid } from '../utils/id';
import { getFileType } from '../utils/format';

export const ROOT_FOLDER_ID = 'root';
export const SAVED_CLASSES_FOLDER_ID = 'clases-guardadas';

/* ---------- Consultas (funciones puras sobre el estado) ---------- */

export function getFolderPath(folders, folderId) {
  const path = [];
  let current = folders.find((folder) => folder.id === folderId);
  while (current) {
    path.unshift(current);
    current = folders.find((folder) => folder.id === current.parentId);
  }
  return path;
}

/** Devuelve el tema al que pertenece una carpeta (buscando en sus carpetas padre). */
export function getTopicForFolder(state, folderId) {
  const path = getFolderPath(state.folders, folderId);
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const topic = state.topics.find((item) => item.id === path[i].topicId || item.folderId === path[i].id);
    if (topic) return topic;
  }
  return null;
}

/** IDs de una carpeta y todas sus subcarpetas. */
export function getDescendantFolderIds(folders, folderId) {
  const ids = [folderId];
  for (let i = 0; i < ids.length; i += 1) {
    folders.filter((folder) => folder.parentId === ids[i]).forEach((child) => ids.push(child.id));
  }
  return ids;
}

export function getFilesForTopic(state, topic) {
  if (!topic?.folderId) return [];
  const folderIds = getDescendantFolderIds(state.folders, topic.folderId);
  return state.files.filter((file) => folderIds.includes(file.folderId));
}

/* ---------- Carpetas ---------- */

export async function createFolder({ name, parentId }, user) {
  const folder = { id: uid('f-'), name: name.trim(), parentId: parentId || ROOT_FOLDER_ID, createdAt: new Date().toISOString() };
  updateState((state) => ({ ...state, folders: [...state.folders, folder] }));
  return folder;
}

export async function renameFolder(folderId, name) {
  updateState((state) => ({
    ...state,
    folders: state.folders.map((folder) => (folder.id === folderId ? { ...folder, name: name.trim() } : folder)),
    topics: state.topics.map((topic) => (topic.folderId === folderId ? { ...topic, name: name.trim() } : topic)),
  }));
}

export async function deleteFolder(folderId) {
  if (folderId === ROOT_FOLDER_ID) throw new Error('No se puede eliminar la carpeta principal');
  const state = getState();
  const folderIds = getDescendantFolderIds(state.folders, folderId);
  const removedFiles = state.files.filter((file) => folderIds.includes(file.folderId));
  updateState((current) => ({
    ...current,
    folders: current.folders.filter((folder) => !folderIds.includes(folder.id)),
    files: current.files.filter((file) => !folderIds.includes(file.folderId)),
    topics: current.topics.map((topic) => (folderIds.includes(topic.folderId) ? { ...topic, folderId: null } : topic)),
  }));
  await Promise.all(removedFiles.map((file) => deleteBlob(file.id).catch(() => {})));
}

/* ---------- Archivos ---------- */

export async function uploadFiles(fileList, { folderId, category = 'teoria', visibility = 'public' }, user) {
  const uploaded = [];
  for (const file of fileList) {
    const record = {
      id: uid('file-'),
      name: file.name,
      folderId,
      type: getFileType(file.name || file.type),
      mime: file.type,
      category,
      visibility,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      ownerId: user.id,
    };
    Object.assign(record, await putBlob(record.id, file));
    uploaded.push(record);
  }
  updateState((state) => {
    let next = { ...state, files: [...uploaded, ...state.files] };
    if (visibility === 'public' && uploaded.length) {
      const text = uploaded.length === 1 ? `subió «${uploaded[0].name}»` : `subió ${uploaded.length} archivos`;
      next = withActivity(next, { userId: user.id, type: 'upload', text, link: `/repositorio/${folderId}` });
    }
    return next;
  });
  return uploaded;
}

export async function moveFile(fileId, folderId) {
  updateState((state) => ({
    ...state,
    files: state.files.map((file) => (file.id === fileId ? { ...file, folderId } : file)),
  }));
}

export async function renameFile(fileId, name) {
  updateState((state) => ({
    ...state,
    files: state.files.map((file) => (file.id === fileId ? { ...file, name: name.trim() } : file)),
  }));
}

export async function deleteFile(fileId) {
  updateState((state) => ({ ...state, files: state.files.filter((file) => file.id !== fileId) }));
  await deleteBlob(fileId).catch(() => {});
}

/** Obtiene el contenido de un archivo (generado para los de ejemplo). */
export async function getFileBlob(file) {
  if (file.sample?.kind === 'pdf') return createSamplePdf(file.sample);
  if (file.sample?.kind === 'image') return fetch(file.sample.src).then((response) => response.blob());
  const blob = await getBlob(file.id);
  if (!blob) throw new Error('El archivo no está disponible en este navegador');
  return blob;
}

export async function openFile(file) {
  // Archivos en Firebase Storage: se abren directo desde su URL.
  if (file.url) {
    window.open(file.url, '_blank', 'noopener');
    return;
  }
  // La pestaña se abre antes de esperar el archivo para que el navegador no la bloquee.
  const tab = window.open('', '_blank');
  try {
    const blob = await getFileBlob(file);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export async function downloadFile(file) {
  let blob;
  try {
    blob = await getFileBlob(file);
  } catch (error) {
    // Si el bucket no tiene CORS configurado no se puede leer el archivo: se abre su URL.
    if (!file.url) throw error;
    window.open(file.url, '_blank', 'noopener');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------- Temas ---------- */

export async function createTopic({ name, summary, explanation, color }, user) {
  const folder = { id: uid('f-'), name: name.trim(), parentId: ROOT_FOLDER_ID, createdAt: new Date().toISOString() };
  const topic = {
    id: uid('tema-'),
    name: name.trim(),
    summary: summary.trim(),
    explanation: explanation.split('\n').map((p) => p.trim()).filter(Boolean),
    formulas: [],
    color,
    folderId: folder.id,
    createdAt: new Date().toISOString(),
  };
  folder.topicId = topic.id;
  updateState((state) =>
    withActivity(
      { ...state, folders: [...state.folders, folder], topics: [...state.topics, topic] },
      { userId: user.id, type: 'topic', text: `creó el tema «${topic.name}»`, link: `/temas/${topic.id}` },
    ),
  );
  return topic;
}

export async function updateTopic(topicId, changes) {
  updateState((state) => ({
    ...state,
    topics: state.topics.map((topic) => (topic.id === topicId ? { ...topic, ...changes } : topic)),
  }));
}
