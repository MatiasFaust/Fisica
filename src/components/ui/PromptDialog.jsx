import { useEffect, useState } from 'react';
import Modal from './Modal';

/** Diálogo con un único campo de texto (crear carpeta, renombrar, etc.). */
export default function PromptDialog({ open, title, label, placeholder, initialValue = '', confirmLabel = 'Guardar', onSubmit, onClose }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    await onSubmit(value.trim());
    onClose();
  };

  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="field__label">{label}</span>
          <input className="input" autoFocus value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} />
        </label>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
