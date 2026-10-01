const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' });
const longDateFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (value) => dateFormatter.format(new Date(value));
export const formatShortDate = (value) => shortDateFormatter.format(new Date(value));
export const formatLongDate = (value) => longDateFormatter.format(new Date(value));
export const formatTime = (value) => timeFormatter.format(new Date(value));

export function formatRelative(value) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return formatDate(value);
}

/** Días hasta una fecha (negativo si ya pasó). */
export function daysUntil(value) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - start) / 86400000);
}

export function formatDue(value) {
  const days = daysUntil(value);
  if (days < 0) return `Venció el ${formatShortDate(value)}`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileType(nameOrMime = '') {
  const value = nameOrMime.toLowerCase();
  if (value.endsWith('.pdf') || value.includes('pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(value) || value.startsWith('image/')) return 'image';
  if (/\.(docx?|odt|txt|rtf|pptx?|xlsx?)$/.test(value)) return 'doc';
  return 'other';
}

export const FILE_TYPE_LABELS = { pdf: 'PDF', image: 'Imagen', doc: 'Documento', other: 'Archivo' };

export const CATEGORY_LABELS = {
  teoria: 'Material teórico',
  ejercicios: 'Ejercicios',
  complementario: 'Complementario',
};

/** Fecha de hoy como "dd/mm" (para nombres de clases). */
export function todayLabel() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
}

export function normalize(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
