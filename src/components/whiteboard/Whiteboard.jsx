import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  drawGrid,
  drawObject,
  drawRemoteCursor,
  findBackgroundObjectAt,
  getContentBounds,
  isBackgroundObject,
  subscribeImageLoads,
} from './renderer';
import { uid } from '../../utils/id';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const STROKE_TOOLS = new Set(['pen', 'marker', 'eraser']);
const SHAPE_TOOLS = new Set(['line', 'arrow', 'rect', 'ellipse']);
const DRAFT_INTERVAL = 45;
const CURSOR_INTERVAL = 40;
const CURSOR_TIMEOUT = 6000;

const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
export const textSizeFor = (size) => Math.round(16 + size * 2);

/**
 * Lienzo de la pizarra. Maneja dibujo, zoom y desplazamiento.
 * Dos capas: fondo (grilla, imágenes, tarjetas) y tinta (trazos, formas, texto),
 * así el borrador solo borra lo escrito y nunca el ejercicio insertado.
 *
 * Gestos: un dedo/lápiz dibuja, dos dedos mueven y hacen zoom. Si se detecta un
 * lápiz digital, los toques con la mano solo mueven (evita marcas con la palma).
 */
export default function Whiteboard({
  ref,
  page,
  tool,
  color,
  size,
  readOnly = false,
  userId,
  remoteRef,
  onCommit,
  onDraft,
  onCursor,
  onOpenObject,
  onZoomChange,
}) {
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const inkRef = useRef(null);
  const camera = useRef({ x: 40, y: 40, zoom: 1 });
  const viewport = useRef({ width: 0, height: 0, dpr: 1 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const draftRef = useRef(null);
  const penSeen = useRef(false);
  const spaceDown = useRef(false);
  const frame = useRef(0);
  const throttle = useRef({ draft: 0, cursor: 0 });
  const [textEditor, setTextEditor] = useState(null);
  const [panning, setPanning] = useState(false);

  // Las funciones de eventos leen siempre los valores actuales desde aquí.
  const latest = useRef({});
  latest.current = { page, tool, color, size, readOnly, userId, onCommit, onDraft, onCursor, onOpenObject, onZoomChange };

  /* ---------- Render ---------- */

  const render = useCallback(() => {
    frame.current = 0;
    const bgCanvas = bgRef.current;
    const inkCanvas = inkRef.current;
    if (!bgCanvas || !inkCanvas) return;
    const { width, height, dpr } = viewport.current;
    const cam = camera.current;
    const currentPage = latest.current.page;
    const bg = bgCanvas.getContext('2d');
    const ink = inkCanvas.getContext('2d');

    for (const ctx of [bg, ink]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width * dpr, height * dpr);
      ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * cam.x, dpr * cam.y);
    }

    drawGrid(bg, cam, width, height);
    currentPage?.objects.forEach((obj) => drawObject(isBackgroundObject(obj) ? bg : ink, obj));

    const remote = remoteRef?.current;
    remote?.drafts.forEach((draft) => {
      if (draft.pageId === currentPage?.id) drawObject(ink, draft.obj);
    });
    if (draftRef.current) drawObject(ink, draftRef.current);

    if (remote) {
      ink.setTransform(dpr, 0, 0, dpr, 0, 0);
      const now = Date.now();
      remote.cursors.forEach((cursor) => {
        if (now - cursor.at > CURSOR_TIMEOUT || cursor.pageId !== currentPage?.id) return;
        drawRemoteCursor(ink, cursor.x * cam.zoom + cam.x, cursor.y * cam.zoom + cam.y, cursor.name, cursor.color);
      });
    }
  }, [remoteRef]);

  const requestRender = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(render);
  }, [render]);

  useEffect(() => requestRender(), [page, requestRender]);
  useEffect(() => subscribeImageLoads(requestRender), [requestRender]);
  useEffect(() => {
    document.fonts?.ready.then(requestRender);
  }, [requestRender]);

  // Ajusta la resolución de los canvas al tamaño real del contenedor.
  useEffect(() => {
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      // Puede llegar un aviso tardío cuando la pizarra ya se cerró.
      if (!bgRef.current || !inkRef.current) return;
      const { width, height } = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewport.current = { width, height, dpr };
      [bgRef.current, inkRef.current].forEach((canvas) => {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      });
      render();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  /* ---------- Cámara ---------- */

  const setCamera = useCallback(
    (next) => {
      camera.current = next;
      latest.current.onZoomChange?.(next.zoom);
      requestRender();
    },
    [requestRender],
  );

  const zoomAt = useCallback(
    (sx, sy, zoom) => {
      const cam = camera.current;
      const next = clampZoom(zoom);
      setCamera({ zoom: next, x: sx - (sx - cam.x) * (next / cam.zoom), y: sy - (sy - cam.y) * (next / cam.zoom) });
    },
    [setCamera],
  );

  const fitToContent = useCallback(() => {
    const bounds = getContentBounds(latest.current.page?.objects ?? []);
    const { width, height } = viewport.current;
    if (!bounds || !width) {
      setCamera({ x: 40, y: 40, zoom: 1 });
      return;
    }
    const pad = 60;
    const zoom = clampZoom(Math.min(1.2, (width - pad * 2) / (bounds.x2 - bounds.x1), (height - pad * 2) / (bounds.y2 - bounds.y1)));
    setCamera({
      zoom,
      x: (width - (bounds.x2 - bounds.x1) * zoom) / 2 - bounds.x1 * zoom,
      y: (height - (bounds.y2 - bounds.y1) * zoom) / 2 - bounds.y1 * zoom,
    });
  }, [setCamera]);

  useImperativeHandle(
    ref,
    () => ({
      requestRender,
      fitToContent,
      zoomIn: () => zoomAt(viewport.current.width / 2, viewport.current.height / 2, camera.current.zoom * 1.25),
      zoomOut: () => zoomAt(viewport.current.width / 2, viewport.current.height / 2, camera.current.zoom / 1.25),
      resetView: () => setCamera({ x: 40, y: 40, zoom: 1 }),
      /** Punto del mundo que está en el centro de la pantalla (para insertar contenido). */
      getViewCenter: () => {
        const { width, height } = viewport.current;
        const cam = camera.current;
        return { x: (width / 2 - cam.x) / cam.zoom, y: (height / 2 - cam.y) / cam.zoom };
      },
    }),
    [requestRender, fitToContent, zoomAt, setCamera],
  );

  /* ---------- Utilidades de eventos ---------- */

  const toScreen = (event) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const toWorld = ({ x, y }) => {
    const cam = camera.current;
    return { x: (x - cam.x) / cam.zoom, y: (y - cam.y) / cam.zoom };
  };

  const broadcastDraft = (force = false) => {
    const now = performance.now();
    if (!force && now - throttle.current.draft < DRAFT_INTERVAL) return;
    throttle.current.draft = now;
    const draft = draftRef.current;
    latest.current.onDraft?.(draft ? { ...draft, points: draft.points ? [...draft.points] : undefined } : null);
  };

  const cancelDraft = () => {
    if (!draftRef.current) return;
    draftRef.current = null;
    latest.current.onDraft?.(null);
    requestRender();
  };

  const editorRef = useRef(null);
  editorRef.current = textEditor;

  const commitText = useCallback(() => {
    const editor = editorRef.current;
    editorRef.current = null;
    if (editor?.value.trim()) {
      const { color: textColor, size: textSize, userId: author } = latest.current;
      latest.current.onCommit?.([
        { id: uid('o-'), type: 'text', x: editor.x, y: editor.y, text: editor.value, color: textColor, size: textSizeFor(textSize), authorId: author },
      ]);
    }
    setTextEditor(null);
  }, []);

  /* ---------- Puntero (mouse, dedo y lápiz) ---------- */

  const handlePointerDown = (event) => {
    if (event.button === 2) return;
    const screen = toScreen(event);
    containerRef.current.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, screen);
    if (event.pointerType === 'pen') penSeen.current = true;

    // Segundo dedo: pasamos a zoom con pellizco y descartamos el trazo empezado.
    if (pointers.current.size === 2) {
      cancelDraft();
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: 'pinch',
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startCam: { ...camera.current },
      };
      return;
    }
    if (pointers.current.size > 2) return;

    const { tool: currentTool, readOnly: locked, color: currentColor, size: currentSize, userId: author, page: currentPage } = latest.current;
    const world = toWorld(screen);
    const panOnly =
      locked || currentTool === 'hand' || event.button === 1 || spaceDown.current || (event.pointerType === 'touch' && penSeen.current);

    if (textEditor) {
      commitText();
      return;
    }

    if (panOnly) {
      gesture.current = {
        mode: 'pan',
        start: screen,
        startCam: { ...camera.current },
        moved: false,
        target: findBackgroundObjectAt(currentPage?.objects ?? [], world.x, world.y),
      };
      setPanning(true);
      return;
    }

    if (currentTool === 'text') {
      // Evita que el mousedown que sigue le saque el foco al cuadro de texto recién creado.
      event.preventDefault();
      setTextEditor({ x: world.x, y: world.y, value: '' });
      return;
    }

    const base = { id: uid('o-'), type: currentTool, color: currentColor, authorId: author };
    if (STROKE_TOOLS.has(currentTool)) {
      const strokeSize = currentTool === 'eraser' ? Math.max(14, currentSize * 5) : currentTool === 'marker' ? Math.max(12, currentSize * 3.5) : currentSize;
      draftRef.current = { ...base, size: strokeSize, points: [[world.x, world.y]] };
    } else if (SHAPE_TOOLS.has(currentTool)) {
      draftRef.current = { ...base, size: currentSize, x1: world.x, y1: world.y, x2: world.x, y2: world.y };
    }
    gesture.current = { mode: 'draw' };
    requestRender();
  };

  const handlePointerMove = (event) => {
    const screen = toScreen(event);
    const world = toWorld(screen);

    // Cursor visible para los demás participantes.
    const now = performance.now();
    if (now - throttle.current.cursor > CURSOR_INTERVAL) {
      throttle.current.cursor = now;
      latest.current.onCursor?.(world);
    }

    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, screen);
    const current = gesture.current;
    if (!current) return;

    if (current.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { startCam, startDist, startMid } = current;
      const zoom = clampZoom(startCam.zoom * (dist / startDist));
      setCamera({
        zoom,
        x: mid.x - (startMid.x - startCam.x) * (zoom / startCam.zoom),
        y: mid.y - (startMid.y - startCam.y) * (zoom / startCam.zoom),
      });
    } else if (current.mode === 'pan') {
      const dx = screen.x - current.start.x;
      const dy = screen.y - current.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
      setCamera({ ...current.startCam, x: current.startCam.x + dx, y: current.startCam.y + dy });
    } else if (current.mode === 'draw' && draftRef.current) {
      const draft = draftRef.current;
      if (draft.points) {
        // Los eventos "coalesced" dan todos los puntos intermedios del lápiz: trazo más fino.
        const events = event.getCoalescedEvents?.() ?? [event];
        const minDistance = 0.6 / camera.current.zoom;
        events.forEach((sample) => {
          const point = toWorld(toScreen(sample));
          const last = draft.points[draft.points.length - 1];
          if (Math.hypot(point.x - last[0], point.y - last[1]) >= minDistance) draft.points.push([point.x, point.y]);
        });
      } else {
        draft.x2 = world.x;
        draft.y2 = world.y;
      }
      broadcastDraft();
      requestRender();
    }
  };

  const handlePointerUp = (event) => {
    pointers.current.delete(event.pointerId);
    const current = gesture.current;
    if (!current) return;

    if (current.mode === 'pinch') {
      // Al levantar un dedo del pellizco no empezamos a dibujar con el que queda.
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    gesture.current = null;

    if (current.mode === 'pan') {
      setPanning(false);
      if (!current.moved && current.target) latest.current.onOpenObject?.(current.target);
      return;
    }

    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;
    const isTinyShape = !draft.points && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 3;
    if (!isTinyShape) latest.current.onCommit?.([draft]);
    latest.current.onDraft?.(null);
    requestRender();
  };

  /* ---------- Rueda y teclado ---------- */

  useEffect(() => {
    const container = containerRef.current;
    const handleWheel = (event) => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        zoomAt(event.clientX - rect.left, event.clientY - rect.top, camera.current.zoom * Math.exp(-event.deltaY * 0.01));
      } else {
        const cam = camera.current;
        setCamera({ ...cam, x: cam.x - event.deltaX, y: cam.y - event.deltaY });
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomAt, setCamera]);

  useEffect(() => {
    const isTyping = (event) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    const down = (event) => {
      if (event.code === 'Space' && !isTyping(event)) {
        spaceDown.current = true;
        event.preventDefault();
      }
    };
    const up = (event) => {
      if (event.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  /* ---------- Vista ---------- */

  const cam = camera.current;
  const cursorClass = readOnly || tool === 'hand' ? (panning ? 'is-grabbing' : 'is-grab') : tool === 'text' ? 'is-text' : 'is-draw';

  return (
    <div
      ref={containerRef}
      className={`whiteboard ${cursorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      <canvas ref={bgRef} className="whiteboard__layer" />
      <canvas ref={inkRef} className="whiteboard__layer" />
      {textEditor && (
        <textarea
          className="whiteboard__text-editor"
          autoFocus
          value={textEditor.value}
          placeholder="Escribí…"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              commitText();
            }
            if (event.key === 'Escape') setTextEditor(null);
          }}
          rows={Math.max(1, textEditor.value.split('\n').length)}
          style={{
            left: textEditor.x * cam.zoom + cam.x,
            top: textEditor.y * cam.zoom + cam.y,
            fontSize: textSizeFor(size) * cam.zoom,
            color,
          }}
        />
      )}
    </div>
  );
}
