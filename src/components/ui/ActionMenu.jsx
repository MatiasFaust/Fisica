import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

/** Botón de "más opciones" con un menú desplegable. */
export default function ActionMenu({ items, label = 'Más opciones' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="icon-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="menu__list" role="menu">
          {items.filter(Boolean).map(({ label: itemLabel, icon: Icon, onClick, danger }) => (
            <button
              key={itemLabel}
              role="menuitem"
              className={`menu__item ${danger ? 'menu__item--danger' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onClick();
              }}
            >
              {Icon && <Icon size={16} />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
