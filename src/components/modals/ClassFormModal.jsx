import { useEffect, useState } from 'react';
import { Check, DoorClosed, Eye, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import UserAvatar from '../UserAvatar';
import { DEFAULT_ACCESS } from '../../services/classAccessService';

const initialForm = (title, topicId) => ({ title, topicId, access: { ...DEFAULT_ACCESS, allowed: [] } });

/**
 * Formulario de título + tema, usado para crear una clase en vivo y para guardarla.
 * Si recibe `students`, también permite elegir quiénes entran y cómo (clase nueva).
 */
export default function ClassFormModal({ open, title, subtitle, confirmLabel, initialTitle = '', initialTopicId = '', topics, students, onClose, onSubmit, extraActions }) {
  const [form, setForm] = useState(() => initialForm(initialTitle, initialTopicId));
  const access = form.access;
  const setAccess = (changes) => setForm({ ...form, access: { ...access, ...changes } });

  useEffect(() => {
    if (open) setForm(initialForm(initialTitle, initialTopicId));
  }, [open, initialTitle, initialTopicId]);

  const toggleStudent = (id) =>
    setAccess({ allowed: access.allowed.includes(id) ? access.allowed.filter((item) => item !== id) : [...access.allowed, id] });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(form);
    onClose();
  };

  const missingStudents = students && !access.all && access.allowed.length === 0;

  return (
    <Modal open={open} title={title} subtitle={subtitle} onClose={onClose} size={students ? 'md' : 'sm'}>
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

        {students && (
          <>
            <div className="field">
              <span className="field__label">
                <Users size={15} /> ¿Quiénes pueden entrar?
              </span>
              <div className="segmented">
                <button type="button" className={access.all ? 'is-active' : ''} onClick={() => setAccess({ all: true })}>
                  Todos los alumnos
                </button>
                <button type="button" className={!access.all ? 'is-active' : ''} onClick={() => setAccess({ all: false })}>
                  Elegir alumnos
                </button>
              </div>
              {!access.all &&
                (students.length ? (
                  <div className="student-checklist">
                    {students.map((student) => {
                      const checked = access.allowed.includes(student.id);
                      return (
                        <button type="button" key={student.id} className={`student-check ${checked ? 'is-checked' : ''}`} onClick={() => toggleStudent(student.id)}>
                          <UserAvatar user={student} size={30} />
                          <span>{student.name}</span>
                          <span className="student-check__box">{checked && <Check size={14} />}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">Todavía no hay alumnos aprobados.</p>
                ))}
            </div>

            <label className="option-row">
              <span className="option-row__icon">
                <DoorClosed size={18} />
              </span>
              <span className="option-row__text">
                <strong>Sala de espera</strong>
                <span>Los alumnos esperan a que los dejes pasar.</span>
              </span>
              <input type="checkbox" className="switch" checked={access.waiting} onChange={(event) => setAccess({ waiting: event.target.checked })} />
            </label>
            <label className="option-row">
              <span className="option-row__icon">
                <Eye size={18} />
              </span>
              <span className="option-row__text">
                <strong>Entran solo a mirar</strong>
                <span>Nadie escribe hasta que le des permiso desde Participantes.</span>
              </span>
              <input type="checkbox" className="switch" checked={access.readOnly} onChange={(event) => setAccess({ readOnly: event.target.checked })} />
            </label>
          </>
        )}

        <div className="form__actions">
          {extraActions}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!form.title.trim() || missingStudents}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
