import { useState } from 'react';
import { ImagePlus, FileText, X } from 'lucide-react';
import Modal from '../ui/Modal';
import { DIFFICULTIES } from '../../services/exerciseService';

const inAWeek = () => {
  const date = new Date(Date.now() + 7 * 86400000);
  return date.toISOString().slice(0, 10);
};

const emptyForm = (topicId) => ({ title: '', topicId: topicId ?? '', statement: '', difficulty: 'media', dueDate: inAWeek(), imageFile: null, pdfFile: null });

export default function ExerciseFormModal({ open, topics, defaultTopicId, onClose, onSubmit }) {
  const [form, setForm] = useState(() => emptyForm(defaultTopicId ?? topics[0]?.id));
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const close = () => {
    setForm(emptyForm(defaultTopicId ?? topics[0]?.id));
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(form);
      close();
    } finally {
      setBusy(false);
    }
  };

  const valid = form.title.trim() && form.statement.trim() && form.topicId && form.dueDate;

  return (
    <Modal open={open} title="Nuevo ejercicio" subtitle="Los alumnos lo verán en la sección Ejercicios." onClose={close} size="lg">
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Título</span>
          <input className="input" value={form.title} onChange={set('title')} placeholder="Ej.: Suma de vectores" autoFocus />
        </label>

        <div className="form__row">
          <label className="field">
            <span className="field__label">Tema</span>
            <select className="input" value={form.topicId} onChange={set('topicId')}>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Dificultad</span>
            <select className="input" value={form.difficulty} onChange={set('difficulty')}>
              {Object.entries(DIFFICULTIES).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Fecha de entrega</span>
            <input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Consigna</span>
          <textarea className="input" rows={5} value={form.statement} onChange={set('statement')} placeholder="Escribí el enunciado del ejercicio…" />
        </label>

        <div className="form__row">
          <AttachField
            label="Imagen (opcional)"
            icon={ImagePlus}
            accept="image/*"
            file={form.imageFile}
            onChange={(file) => setForm({ ...form, imageFile: file })}
          />
          <AttachField
            label="PDF (opcional)"
            icon={FileText}
            accept=".pdf"
            file={form.pdfFile}
            onChange={(file) => setForm({ ...form, pdfFile: file })}
          />
        </div>

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!valid || busy}>
            {busy ? 'Publicando…' : 'Publicar ejercicio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AttachField({ label, icon: Icon, accept, file, onChange }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {file ? (
        <div className="attach attach--filled">
          <Icon size={18} />
          <span className="attach__name">{file.name}</span>
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => onChange(null)} aria-label="Quitar">
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="attach">
          <Icon size={18} />
          <span>Adjuntar</span>
          <input type="file" accept={accept} hidden onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
