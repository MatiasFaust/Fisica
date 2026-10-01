import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';

/** Formulario de título + tema, usado para crear una clase en vivo y para guardarla. */
export default function ClassFormModal({ open, title, subtitle, confirmLabel, initialTitle = '', initialTopicId = '', topics, onClose, onSubmit, extraActions }) {
  const [form, setForm] = useState({ title: initialTitle, topicId: initialTopicId });

  useEffect(() => {
    if (open) setForm({ title: initialTitle, topicId: initialTopicId });
  }, [open, initialTitle, initialTopicId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(form);
    onClose();
  };

  return (
    <Modal open={open} title={title} subtitle={subtitle} onClose={onClose} size="sm">
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Nombre de la clase</span>
          <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Tema</span>
          <select className="input" value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })}>
            <option value="">Sin tema</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form__actions">
          {extraActions}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!form.title.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
