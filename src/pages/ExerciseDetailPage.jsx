import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, PenLine, Trash2, CheckCircle2, Send, RotateCcw, ClipboardList, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import { useFileActions } from '../hooks/useFileActions';
import { useOpenInWhiteboard } from '../hooks/useOpenInWhiteboard';
import Breadcrumbs from '../components/Breadcrumbs';
import FileCard from '../components/FileCard';
import UserAvatar from '../components/UserAvatar';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { DIFFICULTIES, deleteExercise, getSubmission, reopenExercise, submitAnswer } from '../services/exerciseService';
import { formatDate, formatDue, formatRelative, daysUntil } from '../utils/format';

export default function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileActions = useFileActions();
  const openInWhiteboard = useOpenInWhiteboard();
  const [answer, setAnswer] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exercise = state.exercises.find((e) => e.id === exerciseId);
  if (!exercise) {
    return (
      <div className="page">
        <EmptyState icon={ClipboardList} title="Ejercicio no encontrado" action={<Link to="/ejercicios" className="btn btn--primary">Ver ejercicios</Link>} />
      </div>
    );
  }

  const topic = state.topics.find((t) => t.id === exercise.topicId);
  const file = state.files.find((f) => f.id === exercise.fileId);
  const difficulty = DIFFICULTIES[exercise.difficulty] ?? DIFFICULTIES.media;
  const mySubmission = getSubmission(state, exercise.id, user.id);
  const students = state.users.filter((u) => u.role === 'student');
  const overdue = daysUntil(exercise.dueDate) < 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitAnswer(exercise, answer, user);
    setAnswer('');
    toast.success('¡Ejercicio marcado como resuelto!');
  };

  return (
    <div className="page page--narrow">
      <Breadcrumbs items={[{ label: 'Ejercicios', to: '/ejercicios' }, { label: exercise.title }]} />

      <header className="exercise-header" style={{ '--topic-color': topic?.color }}>
        <div className="exercise-header__tags">
          {topic && (
            <Link to={`/temas/${topic.id}`} className="tag tag--topic">
              {topic.name}
            </Link>
          )}
          <span className={`pill pill--${difficulty.tone}`}>{difficulty.label}</span>
          <span className={`due ${overdue ? 'is-overdue' : ''}`}>
            <CalendarDays size={15} /> {formatDate(exercise.dueDate)} · {formatDue(exercise.dueDate)}
          </span>
        </div>
        <h1>{exercise.title}</h1>
        <div className="exercise-header__actions">
          <button className="btn btn--primary" onClick={() => openInWhiteboard({ kind: 'exercise', id: exercise.id }, exercise.topicId)}>
            <PenLine size={18} /> Abrir en pizarra
          </button>
          {isTeacher && (
            <button className="btn btn--ghost btn--danger-text" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} /> Eliminar
            </button>
          )}
        </div>
      </header>

      <section className="card">
        <h2 className="card__title">Consigna</h2>
        <p className="statement">{exercise.statement}</p>
        {exercise.imageUrl && <img className="statement__image" src={exercise.imageUrl} alt={`Imagen del ejercicio ${exercise.title}`} />}
        {file && (
          <div className="file-list file-list--compact">
            <FileCard file={file} topicName={topic?.name} onOpen={() => fileActions.open(file)} onDownload={() => fileActions.download(file)} />
          </div>
        )}
      </section>

      {!isTeacher && (
        <section className="card">
          <h2 className="card__title">Tu resolución</h2>
          {mySubmission ? (
            <div className="submission submission--done">
              <CheckCircle2 size={22} />
              <div>
                <strong>Resuelto {formatRelative(mySubmission.submittedAt)}</strong>
                {mySubmission.answer && <p>{mySubmission.answer}</p>}
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => reopenExercise(exercise.id, user.id)}>
                <RotateCcw size={15} /> Editar
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={handleSubmit}>
              <p className="muted">Escribí tu resultado o un resumen del planteo. También podés resolverlo en tu pizarra personal con «Abrir en pizarra».</p>
              <textarea className="input" rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Mi resultado es…" />
              <div className="form__actions">
                <button type="submit" className="btn btn--primary">
                  <Send size={16} /> Marcar como resuelto
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {isTeacher && (
        <section className="card">
          <h2 className="card__title">
            Entregas ({state.submissions.filter((s) => s.exerciseId === exercise.id).length}/{students.length})
          </h2>
          <ul className="submissions">
            {students.map((student) => {
              const submission = getSubmission(state, exercise.id, student.id);
              return (
                <li key={student.id} className="submissions__item">
                  <UserAvatar user={student} size={36} />
                  <div className="submissions__text">
                    <strong>{student.name}</strong>
                    {submission ? <p>{submission.answer || 'Sin comentario.'}</p> : <p className="muted">Todavía no entregó.</p>}
                  </div>
                  {submission ? (
                    <span className="status status--success">
                      <CheckCircle2 size={14} /> {formatRelative(submission.submittedAt)}
                    </span>
                  ) : (
                    <span className="status">
                      <Circle size={14} /> Pendiente
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar ejercicio"
        message={`¿Eliminar «${exercise.title}»? También se borran las entregas de los alumnos.`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteExercise(exercise.id);
          toast.success('Ejercicio eliminado');
          navigate('/ejercicios');
        }}
      />
    </div>
  );
}
