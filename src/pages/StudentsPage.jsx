import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, Clock, UserCheck, UserX, Users, Copy, ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import PageHeader from '../components/ui/PageHeader';
import UserAvatar from '../components/UserAvatar';
import ActionMenu from '../components/ui/ActionMenu';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getSubmission } from '../services/exerciseService';
import { getBlockedStudents, getPendingStudents, getStudents, setStudentStatus, STUDENT_STATUS } from '../services/studentService';
import { daysUntil, formatRelative } from '../utils/format';

export default function StudentsPage() {
  const state = useStore();
  const { cloud } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [toRevoke, setToRevoke] = useState(null);

  const students = getStudents(state);
  const pending = getPendingStudents(state);
  const blocked = getBlockedStudents(state);
  const total = state.exercises.length;
  const signupLink = window.location.origin;

  const changeStatus = async (student, status, message) => {
    try {
      await setStudentStatus(student.id, status);
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cambiar el acceso. Probá de nuevo.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupLink);
      toast.success('Link copiado');
    } catch {
      toast.info(signupLink);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Curso de Física"
        title="Alumnos"
        subtitle={`${students.length} ${students.length === 1 ? 'alumno' : 'alumnos'} con acceso · seguimiento de ejercicios y actividad.`}
        actions={
          cloud && (
            <button className="btn btn--soft" onClick={copyLink}>
              <Copy size={17} /> Copiar link para alumnos
            </button>
          )
        }
      />

      {pending.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            <Clock size={18} /> Solicitudes pendientes ({pending.length})
          </h2>
          <ul className="requests">
            {pending.map((student) => (
              <li key={student.id} className="request">
                <UserAvatar user={student} size={42} />
                <div className="request__info">
                  <strong>{student.name}</strong>
                  <span>
                    {student.email}
                    {student.createdAt && ` · pidió acceso ${formatRelative(student.createdAt)}`}
                  </span>
                </div>
                <div className="request__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => changeStatus(student, STUDENT_STATUS.blocked, `Rechazaste a ${student.name}`)}>
                    <UserX size={16} /> Rechazar
                  </button>
                  <button className="btn btn--primary btn--sm" onClick={() => changeStatus(student, STUDENT_STATUS.approved, `${student.name} ya puede entrar al curso`)}>
                    <UserCheck size={16} /> Aprobar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {students.length ? (
        <div className="grid grid--students">
          {students.map((student) => {
            const done = state.submissions.filter((s) => s.studentId === student.id);
            const overdue = state.exercises.filter((e) => daysUntil(e.dueDate) < 0 && !getSubmission(state, e.id, student.id));
            const lastActivity = state.activity.find((a) => a.userId === student.id);
            const progress = total ? Math.round((done.length / total) * 100) : 0;

            return (
              <article key={student.id} className="student-card">
                <header className="student-card__header">
                  <UserAvatar user={student} size={48} />
                  <div className="student-card__who">
                    <h3>{student.name}</h3>
                    <a href={`mailto:${student.email}`} className="muted student-card__mail">
                      <Mail size={13} /> <span className="truncate">{student.email}</span>
                    </a>
                  </div>
                  {cloud && <ActionMenu items={[{ label: 'Quitar acceso', icon: ShieldX, danger: true, onClick: () => setToRevoke(student) }]} />}
                </header>

                <div className="progress">
                  <div className="progress__labels">
                    <span>Ejercicios resueltos</span>
                    <strong>
                      {done.length}/{total}
                    </strong>
                  </div>
                  <div className="progress__bar">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <ul className="student-card__facts">
                  <li>
                    <CheckCircle2 size={15} className="text-success" /> {progress}% completado
                  </li>
                  <li className={overdue.length ? 'text-danger' : ''}>
                    <Clock size={15} /> {overdue.length ? `${overdue.length} vencido${overdue.length > 1 ? 's' : ''} sin entregar` : 'Sin vencidos'}
                  </li>
                </ul>

                {lastActivity ? (
                  <button className="student-card__activity" onClick={() => lastActivity.link && navigate(lastActivity.link)}>
                    Última actividad: {lastActivity.text} · {formatRelative(lastActivity.at)}
                  </button>
                ) : (
                  <p className="student-card__activity muted">Sin actividad reciente</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Todavía no hay alumnos con acceso"
          text={
            cloud
              ? `Compartí el link ${signupLink} con tus alumnos. Cada uno crea su cuenta y te aparece acá para que lo apruebes.`
              : 'Los alumnos aparecen acá cuando se suman al curso.'
          }
          action={
            cloud && (
              <button className="btn btn--primary" onClick={copyLink}>
                <Copy size={17} /> Copiar link
              </button>
            )
          }
        />
      )}

      {blocked.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            <ShieldX size={18} /> Sin acceso ({blocked.length})
          </h2>
          <ul className="requests">
            {blocked.map((student) => (
              <li key={student.id} className="request is-muted">
                <UserAvatar user={student} size={38} />
                <div className="request__info">
                  <strong>{student.name}</strong>
                  <span>{student.email}</span>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => changeStatus(student, STUDENT_STATUS.approved, `${student.name} ya puede entrar al curso`)}>
                  <UserCheck size={16} /> Dar acceso
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(toRevoke)}
        title="Quitar acceso"
        message={`${toRevoke?.name ?? ''} no va a poder entrar más al curso. Sus entregas se conservan y podés volver a darle acceso cuando quieras.`}
        confirmLabel="Quitar acceso"
        danger
        onClose={() => setToRevoke(null)}
        onConfirm={() => changeStatus(toRevoke, STUDENT_STATUS.blocked, `${toRevoke.name} ya no tiene acceso`)}
      />
    </div>
  );
}
