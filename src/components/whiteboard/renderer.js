/**
 * Dibujo de los objetos de la pizarra sobre Canvas 2D.
 * Las coordenadas de los objetos son "del mundo": no dependen del zoom ni del desplazamiento.
 */

const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
const GRID = 40;

/* ---------- Caché de imágenes ---------- */

const images = new Map();
const imageListeners = new Set();

function getImage(src) {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => imageListeners.forEach((listener) => listener());
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

export function subscribeImageLoads(listener) {
  imageListeners.add(listener);
  return () => imageListeners.delete(listener);
}

/** Imágenes y tarjetas van en la capa de fondo: el borrador no las afecta. */
export const isBackgroundObject = (obj) => obj.type === 'image' || obj.type === 'card';

/* ---------- Grilla ---------- */

export function drawGrid(ctx, camera, width, height) {
  let spacing = GRID;
  while (spacing * camera.zoom < 18) spacing *= 2;
  const left = -camera.x / camera.zoom;
  const top = -camera.y / camera.zoom;
  const right = left + width / camera.zoom;
  const bottom = top + height / camera.zoom;
  const radius = 1.3 / camera.zoom;

  ctx.fillStyle = '#d5dde8';
  ctx.beginPath();
  for (let x = Math.floor(left / spacing) * spacing; x < right; x += spacing) {
    for (let y = Math.floor(top / spacing) * spacing; y < bottom; y += spacing) {
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/* ---------- Objetos ---------- */

function drawStroke(ctx, obj) {
  const { points } = obj;
  if (!points?.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = obj.size;
  if (obj.type === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = ctx.fillStyle = '#000';
  } else {
    ctx.strokeStyle = ctx.fillStyle = obj.color;
    if (obj.type === 'marker') ctx.globalAlpha = 0.38;
  }

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], obj.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Curvas cuadráticas entre puntos medios: trazo suave aunque haya pocos puntos.
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i][0] + points[i + 1][0]) / 2;
      const midY = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShape(ctx, obj) {
  const { x1, y1, x2, y2 } = obj;
  ctx.save();
  ctx.strokeStyle = obj.color;
  ctx.fillStyle = obj.color;
  ctx.lineWidth = obj.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (obj.type === 'rect') {
    ctx.roundRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), Math.min(6, obj.size * 2));
    ctx.stroke();
  } else if (obj.type === 'ellipse') {
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(12, obj.size * 4);
    // En las flechas la línea termina antes de la punta para que no sobresalga.
    const endX = obj.type === 'arrow' ? x2 - Math.cos(angle) * head * 0.6 : x2;
    const endY = obj.type === 'arrow' ? y2 - Math.sin(angle) * head * 0.6 : y2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    if (obj.type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawText(ctx, obj) {
  ctx.save();
  ctx.fillStyle = obj.color;
  ctx.font = `500 ${obj.size}px ${FONT}`;
  ctx.textBaseline = 'top';
  obj.text.split('\n').forEach((line, index) => ctx.fillText(line, obj.x, obj.y + index * obj.size * 1.25));
  ctx.restore();
}

function drawImageObject(ctx, obj) {
  const img = getImage(obj.src);
  ctx.save();
  ctx.shadowColor = 'rgba(15, 42, 74, 0.12)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.restore();
  if (img) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
  ctx.save();
  ctx.strokeStyle = '#dbe3ee';
  ctx.lineWidth = 1;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
  ctx.restore();
}

/* ---------- Tarjetas (ejercicios, archivos, temas) ---------- */

const CARD_PAD = 24;

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  text.split('\n').forEach((paragraph) => {
    let current = '';
    paragraph.split(' ').forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    lines.push(current);
  });
  return lines;
}

let measureCtx;
/** Calcula las líneas y la altura de una tarjeta según su contenido. */
export function layoutCard(card, ctx) {
  const context = ctx ?? (measureCtx ??= document.createElement('canvas').getContext('2d'));
  const inner = card.w - CARD_PAD * 2;
  context.font = `700 22px ${FONT}`;
  const titleLines = wrapText(context, card.title, inner);
  context.font = `400 17px ${FONT}`;
  const bodyLines = card.body ? wrapText(context, card.body, inner) : [];
  const height = CARD_PAD + 18 + 12 + titleLines.length * 29 + (bodyLines.length ? 10 + bodyLines.length * 25 : 0) + (card.hint ? 36 : 0) + CARD_PAD;
  return { titleLines, bodyLines, height };
}

function drawCard(ctx, card) {
  const { titleLines, bodyLines, height } = layoutCard(card, ctx);
  const accent = card.accent ?? '#2563eb';
  ctx.save();
  ctx.shadowColor = 'rgba(15, 42, 74, 0.14)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(card.x, card.y, card.w, height, 16);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(card.x, card.y, card.w, height, 16);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(card.x, card.y, 6, height);
  ctx.restore();

  let y = card.y + CARD_PAD;
  const x = card.x + CARD_PAD;
  ctx.textBaseline = 'top';
  ctx.fillStyle = accent;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText(card.tag.toUpperCase(), x, y);
  y += 30;
  ctx.fillStyle = '#0f2a4a';
  ctx.font = `700 22px ${FONT}`;
  titleLines.forEach((line) => {
    ctx.fillText(line, x, y);
    y += 29;
  });
  if (bodyLines.length) {
    y += 10;
    ctx.fillStyle = '#334155';
    ctx.font = `400 17px ${FONT}`;
    bodyLines.forEach((line) => {
      ctx.fillText(line, x, y);
      y += 25;
    });
  }
  if (card.hint) {
    y += 12;
    ctx.fillStyle = accent;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(card.hint, x, y);
  }
}

export function drawObject(ctx, obj) {
  switch (obj.type) {
    case 'pen':
    case 'marker':
    case 'eraser':
      drawStroke(ctx, obj);
      break;
    case 'line':
    case 'arrow':
    case 'rect':
    case 'ellipse':
      drawShape(ctx, obj);
      break;
    case 'text':
      drawText(ctx, obj);
      break;
    case 'image':
      drawImageObject(ctx, obj);
      break;
    case 'card':
      drawCard(ctx, obj);
      break;
    default:
      break;
  }
}

/** Cursor de otro participante, en coordenadas de pantalla. */
export function drawRemoteCursor(ctx, x, y, name, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(4.5, 12.5);
  ctx.lineTo(11, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = `600 12px ${FONT}`;
  const width = ctx.measureText(name).width + 14;
  ctx.beginPath();
  ctx.roundRect(10, 16, width, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 17, 27);
  ctx.restore();
}

/* ---------- Medidas y exportación ---------- */

export function getObjectBounds(obj) {
  switch (obj.type) {
    case 'pen':
    case 'marker':
    case 'eraser': {
      const xs = obj.points.map((p) => p[0]);
      const ys = obj.points.map((p) => p[1]);
      const pad = obj.size / 2;
      return { x1: Math.min(...xs) - pad, y1: Math.min(...ys) - pad, x2: Math.max(...xs) + pad, y2: Math.max(...ys) + pad };
    }
    case 'text': {
      const lines = obj.text.split('\n');
      const longest = Math.max(...lines.map((line) => line.length));
      return { x1: obj.x, y1: obj.y, x2: obj.x + longest * obj.size * 0.6, y2: obj.y + lines.length * obj.size * 1.25 };
    }
    case 'image':
      return { x1: obj.x, y1: obj.y, x2: obj.x + obj.w, y2: obj.y + obj.h };
    case 'card':
      return { x1: obj.x, y1: obj.y, x2: obj.x + obj.w, y2: obj.y + layoutCard(obj).height };
    default:
      return { x1: Math.min(obj.x1, obj.x2), y1: Math.min(obj.y1, obj.y2), x2: Math.max(obj.x1, obj.x2), y2: Math.max(obj.y1, obj.y2) };
  }
}

export function getContentBounds(objects) {
  const visible = objects.filter((obj) => obj.type !== 'eraser');
  if (!visible.length) return null;
  return visible.map(getObjectBounds).reduce((acc, b) => ({
    x1: Math.min(acc.x1, b.x1),
    y1: Math.min(acc.y1, b.y1),
    x2: Math.max(acc.x2, b.x2),
    y2: Math.max(acc.y2, b.y2),
  }));
}

/** Tarjeta o imagen que está bajo un punto (la de más arriba). */
export function findBackgroundObjectAt(objects, x, y) {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const obj = objects[i];
    if (!isBackgroundObject(obj)) continue;
    const b = getObjectBounds(obj);
    if (x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2) return obj;
  }
  return null;
}

/** Genera una imagen PNG con todo el contenido de una hoja. */
export async function exportPageToBlob(page) {
  const bounds = getContentBounds(page.objects) ?? { x1: 0, y1: 0, x2: 800, y2: 600 };
  const pad = 48;
  const width = Math.ceil(bounds.x2 - bounds.x1 + pad * 2);
  const height = Math.ceil(bounds.y2 - bounds.y1 + pad * 2);

  // Espera a que carguen las imágenes de la hoja.
  await Promise.all(
    page.objects
      .filter((obj) => obj.type === 'image')
      .map((obj) => new Promise((resolve) => {
        getImage(obj.src);
        const img = images.get(obj.src);
        if (img.complete) return resolve();
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      })),
  );

  const makeLayer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.translate(pad - bounds.x1, pad - bounds.y1);
    return { canvas, ctx };
  };
  const base = makeLayer();
  const ink = makeLayer();
  base.ctx.save();
  base.ctx.setTransform(1, 0, 0, 1, 0, 0);
  base.ctx.fillStyle = '#ffffff';
  base.ctx.fillRect(0, 0, width, height);
  base.ctx.restore();
  page.objects.forEach((obj) => drawObject(isBackgroundObject(obj) ? base.ctx : ink.ctx, obj));
  base.ctx.setTransform(1, 0, 0, 1, 0, 0);
  base.ctx.drawImage(ink.canvas, 0, 0);
  return new Promise((resolve) => base.canvas.toBlob(resolve, 'image/png'));
}
