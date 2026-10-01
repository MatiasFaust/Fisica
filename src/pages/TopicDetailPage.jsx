import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PenLine, FolderOpen, FileText, ClipboardList, Paperclip, Presentation, BookOpen, Plus, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import { useFileActions } from '../hooks/useFileActions';
import { useOpenInWhiteboard } from '../hooks/useOpenInWhiteboard';
import Breadcrumbs from '../components/Breadcrumbs';
import TopicIcon from '../components/TopicIcon';
import FileCard from '../components/FileCard';
import ExerciseCard from '../components/ExerciseCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ExerciseFormModal from '../components/modals/ExerciseFormModal';
import { getFilesForTopic, updateTopic } from '../services/repositoryService';
import { createExercise, getSubmission } from '../services/exerciseService';
import { daysUntil, formatDate } from '../utils/format';

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileActions = useFileActions();
  const openInWhiteboard = useOpenInWhiteboard();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) {
    return (
      <div className="page">
        <EmptyState icon={BookOpen} title="Tema no encontrado" action={<Link to="/temas" className="btn btn--primary">Ver temas</Link>} />
      </div>
    );
  }

  const files = getFilesForTopic(state, topic).filter((f) => f.visibility !== 'private');
  const pdfs = files.filter((f) => f.type === 'pdf' && f.category !== 'complementario');
  const extra = files.filter((f) => f.type !== 'pdf' || f.category === 'complementario');
  const exercises = state.exercises.filter((e) => e.topicId === topic.id);
  const classes = state.savedClasses.filter((c) => c.topicId === topic.id);
  const students = state.users.filter((u) => u.role === 'student');

  const statusFor = (exercise) => {
    if (isTeacher) return undefined;
    if (getSubmission(state, exercise.id, user.id)) return 'completado';
    return daysUntil(exercise.dueDate) < 0 ? 'vencido' : 'pendiente';
  };

  const renderFiles = (list) => (
    <div className="file-list file-list--compact">
      {list.map((file) => (
        <FileCard key={file.id} file={file} topicName={topic.name} onOpen={() => fileActions.open(file)} onDownload={() => fileActions.download(file)} />
      ))}
    </div>
  );

  return (
    <div className="page">
      <Breadcrumbs items={[{ label: 'Temas', to: '/temas' }, { label: topic.name }]} />

      <section className="topic-hero" style={{ '--topic-color': topic.color }}>
        <TopicIcon topic={topic} size={28} />
        <div className="topic-hero__text">
          <h1>{topic.name}</h1>
          <p>{topic.summary}</p>
        </div>
        <div className="topic-hero__actions">
          {topic.folderId && (
            <Link to={`/repositorio/${topic.folderId}`} className="btn btn--ghost">
              <FolderOpen size={18} /> <span className="hide-sm">Ver carpeta</span>
            </Link>
          )}
          <button className="btn btn--primary" onClick={() => openInWhiteboard({ kind: 'topic', id: topic.id }, topic.id)}>
            <PenLine size={18} /> Abrir en pizarra
          </button>
        </div>
      </section>

      <div className="topic-layout">
        <div className="topic-layout__main">
          <section className="card">
            <header className="card__header">
              <h2>
                <BookOpen size={18} /> Explicación
              </h2>
              {isTeacher && (
                <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                  <Pencil size={15} /> Editar
                </button>
              )}
            </header>
            <div className="prose">
              {topic.explanation?.length ? topic.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p className="muted">Todavía no hay explicación para este tema.</p>}
            </div>
            {topic.formulas?.length > 0 && (
              <div className="formulas">
                <span className="formulas__title">Fórmulas clave</span>
                <div className="formulas__list">
                  {topic.formulas.map((formula) => (
                    <code key={formula}>{formula}</code>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <header className="card__header">
              <h2>
                <ClipboardList size={18} /> Ejercicios
              </h2>
              {isTeacher && (
                <button className="btn btn--soft btn--sm" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Nuevo ejercicio
                </button>
              )}
            </header>
            {exercises.length ? (
              <div className="grid grid--exercises">
                {exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    topic={topic}
                    status={statusFor(exercise)}
                    completedCount={state.submissions.filter((s) => s.exerciseId === exercise.id).length}
                    totalStudents={students.length}
                    onClick={() => navigate(`/ejercicios/${exercise.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="Sin ejercicios todavía" />
            )}
          </section>
        </div>

        <aside className="topic-layout__side">
          <section className="card">
            <header className="card__header">
              <h2>
                <FileText size={18} /> PDFs
              </h2>
            </header>
            {pdfs.length ? renderFiles(pdfs) : <p className="muted">No hay PDFs en este tema.</p>}
          </section>

          <section className="card">
            <header className="card__header">
              <h2>
                <Paperclip size={18} /> Material complementario
              </h2>
            </header>
            {extra.length ? renderFiles(extra) : <p className="muted">Sin material complementario.</p>}
          </section>

          <section className="card">
            <header className="card__header">
              <h2>
                <Presentation size={18} /> Clases guardadas
              </h2>
            </header>
            {classes.length ? (
              <ul className="mini-list">
                {classes.map((item) => (
                  <li key={item.id}>
                    <Link to={`/clases/${item.id}`}>
                      <Presentation size={16} />
                      <span>
                        {item.title} - {formatDate(item.savedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Todavía no se guardaron clases de este tema.</p>
            )}
          </section>
        </aside>
      </div>

      <ExerciseFormModal
        open={creating}
        topics={state.topics}
        defaultTopicId={topic.id}
        onClose={() => setCreating(false)}
        onSubmit={async (form) => {
          try {
            await createExercise({ ...form, topicFolderId: state.topics.find((t) => t.id === form.topicId)?.folderId }, user);
            toast.success('Ejercicio publicado');
          } catch (error) {
            toast.error(error.message);
          }
        }}
      />
      <EditTopicModal
        open={editing}
        topic={topic}
        onClose={() => setEditing(false)}
        onSave={async (changes) => {
          await updateTopic(topic.id, changes);
          toast.success('Tema actualizado');
        }}
      />
    </div>
  );
}

function EditTopicModal({ open, topic, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const current = form ?? {
    summary: topic.summary,
    explanation: (topic.explanation ?? []).join('\n'),
    formulas: (topic.formulas ?? []).join('\n'),
  };
  const set = (field) => (event) => setForm({ ...current, [field]: event.target.value });
  const close = () => {
    setForm(null);
    onClose();
  };

  return (
    <Modal open={open} title={`Editar «${topic.name}»`} onClose={close} size="lg">
      <form
        className="form"
        onSubmit={async (event) => {
          event.preventDefault();
          const lines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);
          await onSave({ summary: current.summary.trim(), explanation: lines(current.explanation), formulas: lines(current.formulas) });
          close();
        }}
      >
        <label className="field">
          <span className="field__label">Descripción corta</span>
          <input className="input" value={current.summary} onChange={set('summary')} />
        </label>
        <label className="field">
          <span className="field__label">Explicación (un párrafo por línea)</span>
          <textarea className="input" rows={6} value={current.explanation} onChange={set('explanation')} />
        </label>
        <label className="field">
          <span className="field__label">Fórmulas clave (una por línea)</span>
          <textarea className="input input--mono" rows={4} value={current.formulas} onChange={set('formulas')} />
        </label>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary">
            Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  );
}
