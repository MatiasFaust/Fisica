import { useState } from 'react';
import Modal from '../ui/Modal';

const TOPIC_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#0f2a4a'];
const EMPTY = { name: '', summary: '', explanation: '', color: TOPIC_COLORS[0] };

/** Crear un tema nuevo: también crea su carpeta en el repositorio. */
export default function TopicFormModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const close = () => {
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(form);
    close();
  };

  return (
    <Modal open={open} title="Nuevo tema" subtitle="Se crea una carpeta con el mismo nombre en el repositorio." onClose={close}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Nombre</span>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Ej.: Movimiento circular" autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Descripción corta</span>
          <input className="input" value={form.summary} onChange={set('summary')} placeholder="Ej.: Velocidad angular y aceleración centrípeta." />
        </label>
        <label className="field">
          <span className="field__label">Explicación</span>
          <textarea className="input" rows={4} value={form.explanation} onChange={set('explanation')} placeholder="Cada párrafo en una línea nueva." />
        </label>
        <div className="field">
          <span className="field__label">Color</span>
          <div className="color-options">
            {TOPIC_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                className={`color-option ${form.color === color ? 'is-active' : ''}`}
                style={{ background: color }}
                onClick={() => setForm({ ...form, color })}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </div>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!form.name.trim() || !form.summary.trim()}>
            Crear tema
          </button>
        </div>
      </form>
    </Modal>
  );
}
