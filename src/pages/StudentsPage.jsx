import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import PageHeader from '../components/ui/PageHeader';
import UserAvatar from '../components/UserAvatar';
import { getSubmission } from '../services/exerciseService';
import { daysUntil, formatRelative } from '../utils/format';

export default function StudentsPage() {
  const state = useStore();
  const navigate = useNavigate();
  const students = state.users.filter((u) => u.role === 'student');
  const total = state.exercises.length;

  return (
    <div className="page">
      <PageHeader eyebrow="Curso de Física" title="Alumnos" subtitle={`${students.length} alumnos · seguimiento de ejercicios y actividad.`} />

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
                <div>
                  <h3>{student.name}</h3>
                  <a href={`mailto:${student.email}`} className="muted student-card__mail">
                    <Mail size={13} /> {student.email}
                  </a>
                </div>
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
    </div>
  );
}
