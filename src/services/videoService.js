/**
 * Videollamada de cada clase en vivo. Se abre en una ventana aparte de la pizarra.
 *  - "jitsi": sala de Jitsi Meet creada automáticamente (gratis, sin límite de tiempo).
 *  - "link":  un link propio del profesor (Google Meet, Zoom, etc.).
 */

const JITSI_BASE = 'https://meet.jit.si';

/** Nombre de sala difícil de adivinar, para que no se cuele nadie de afuera. */
function randomCode(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

/** option: { mode: 'jitsi' | 'link' | 'none', link } → video de la clase (o null). */
export function buildVideo(option, sessionId) {
  if (!option || option.mode === 'none') return null;
  if (option.mode === 'jitsi') {
    const room = `FisicaAula-${sessionId.replace(/[^a-z0-9]/gi, '')}-${randomCode()}`;
    return { provider: 'jitsi', url: `${JITSI_BASE}/${room}` };
  }
  return { provider: 'link', url: normalizeLink(option.link) };
}

export function normalizeLink(link = '') {
  const value = link.trim();
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  return url.toString();
}

export function isValidLink(link = '') {
  try {
    const url = new URL(normalizeLink(link));
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** "Jitsi Meet", "Google Meet", "Zoom" o el dominio del link. */
export function videoLabel(video) {
  if (!video) return '';
  if (video.provider === 'jitsi') return 'Jitsi Meet';
  const host = new URL(video.url).hostname.replace(/^www\./, '');
  if (host.includes('meet.google')) return 'Google Meet';
  if (host.includes('zoom.')) return 'Zoom';
  if (host.includes('teams.')) return 'Microsoft Teams';
  return host;
}

/** Valor inicial del selector a partir del video actual de una clase. */
export function videoOptionFrom(video) {
  if (!video) return { mode: 'none', link: '' };
  return video.provider === 'jitsi' ? { mode: 'jitsi', link: '' } : { mode: 'link', link: video.url };
}

let videoWindow = null;

/**
 * Abre la videollamada en una ventana aparte. Si ya está abierta, la trae al frente
 * (sin recargarla, para no cortar la llamada).
 */
export function openVideoCall(video, user) {
  if (videoWindow && !videoWindow.closed) {
    videoWindow.focus();
    return;
  }
  let url = video.url;
  if (video.provider === 'jitsi') {
    // Jitsi acepta configuración en el "#" del link: nombre visible y micrófono apagado para alumnos.
    const params = [`userInfo.displayName=${encodeURIComponent(JSON.stringify(user.displayName ?? user.name))}`, 'config.prejoinPageEnabled=true'];
    if (user.role !== 'teacher') params.push('config.startWithAudioMuted=true');
    url = `${url}#${params.join('&')}`;
  }
  videoWindow = window.open(url, '_blank', 'popup=yes,width=1024,height=700');
  if (!videoWindow) window.open(url, '_blank');
}
