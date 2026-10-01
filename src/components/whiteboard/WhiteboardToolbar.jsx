import { useEffect, useRef, useState } from 'react';
import {
  Pencil,
  Highlighter,
  Eraser,
  Slash,
  MoveUpRight,
  Square,
  Circle,
  Type,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  ImagePlus,
  FileText,
  ClipboardList,
} from 'lucide-react';

export const TOOLS = [
  { id: 'pen', label: 'Lápiz', icon: Pencil, key: 'p' },
  { id: 'marker', label: 'Marcador', icon: Highlighter, key: 'm' },
  { id: 'eraser', label: 'Borrador', icon: Eraser, key: 'e' },
  { id: 'line', label: 'Línea', icon: Slash, key: 'l' },
  { id: 'arrow', label: 'Flecha', icon: MoveUpRight, key: 'a' },
  { id: 'rect', label: 'Rectángulo', icon: Square, key: 'r' },
  { id: 'ellipse', label: 'Círculo', icon: Circle, key: 'o' },
  { id: 'text', label: 'Texto', icon: Type, key: 't' },
  { id: 'hand', label: 'Mover', icon: Hand, key: 'h' },
];

export const COLORS = ['#0f2a4a', '#1d4ed8', '#0891b2', '#16a34a', '#dc2626', '#f97316', '#facc15', '#7c3aed'];
export const SIZES = [2, 4, 7, 12];

function ToolButton({ label, icon: Icon, active, onClick, disabled, shortcut }) {
  return (
    <button
      className={`wb-tool ${active ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut.toUpperCase()})` : label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={19} />
    </button>
  );
}

export default function WhiteboardToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  canDraw,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canClear,
  onClear,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onInsert,
}) {
  const [styleOpen, setStyleOpen] = useState(false);
  const styleRef = useRef(null);

  useEffect(() => {
    if (!styleOpen) return undefined;
    const close = (event) => !styleRef.current?.contains(event.target) && setStyleOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [styleOpen]);

  return (
    <div className="wb-toolbar" role="toolbar" aria-label="Herramientas de la pizarra">
      <div className="wb-toolbar__group">
        {TOOLS.map((item) => (
          <ToolButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            shortcut={item.key}
            active={tool === item.id}
            disabled={!canDraw && item.id !== 'hand'}
            onClick={() => onToolChange(item.id)}
          />
        ))}
      </div>

      <div className="wb-toolbar__group wb-style" ref={styleRef}>
        <button className="wb-tool wb-style__trigger" onClick={() => setStyleOpen((open) => !open)} disabled={!canDraw} title="Color y grosor" aria-label="Color y grosor">
          <span className="wb-style__swatch" style={{ background: color }} />
          <span className="wb-style__size" style={{ height: Math.min(size, 10) }} />
        </button>
        {styleOpen && (
          <div className="wb-style__panel">
            <p className="wb-style__label">Color</p>
            <div className="wb-style__colors">
              {COLORS.map((value) => (
                <button
                  key={value}
                  className={`wb-color ${color === value ? 'is-active' : ''}`}
                  style={{ background: value }}
                  onClick={() => onColorChange(value)}
                  aria-label={`Color ${value}`}
                />
              ))}
              <label className="wb-color wb-color--custom" title="Otro color">
                <input type="color" value={color} onChange={(event) => onColorChange(event.target.value)} />
              </label>
            </div>
            <p className="wb-style__label">Grosor</p>
            <div className="wb-style__sizes">
              {SIZES.map((value) => (
                <button key={value} className={`wb-size ${size === value ? 'is-active' : ''}`} onClick={() => onSizeChange(value)} aria-label={`Grosor ${value}`}>
                  <span style={{ width: value + 4, height: value + 4, background: color }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wb-toolbar__group">
        <ToolButton label="Deshacer" icon={Undo2} onClick={onUndo} disabled={!canUndo} shortcut="ctrl+z" />
        <ToolButton label="Rehacer" icon={Redo2} onClick={onRedo} disabled={!canRedo} shortcut="ctrl+y" />
        {canClear && <ToolButton label="Borrar pizarra" icon={Trash2} onClick={onClear} />}
      </div>

      {canDraw && (
        <div className="wb-toolbar__group">
          <ToolButton label="Insertar imagen" icon={ImagePlus} onClick={() => onInsert('image')} />
          <ToolButton label="Insertar PDF del repositorio" icon={FileText} onClick={() => onInsert('file')} />
          <ToolButton label="Insertar ejercicio" icon={ClipboardList} onClick={() => onInsert('exercise')} />
        </div>
      )}

      <div className="wb-toolbar__group">
        <ToolButton label="Alejar" icon={ZoomOut} onClick={onZoomOut} />
        <button className="wb-zoom" onClick={onResetZoom} title="Restablecer vista">
          {Math.round(zoom * 100)}%
        </button>
        <ToolButton label="Acercar" icon={ZoomIn} onClick={onZoomIn} />
      </div>
    </div>
  );
}
