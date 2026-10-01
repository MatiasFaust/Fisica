import { CalendarDays, CheckCircle2, Circle, AlertCircle, Users } from 'lucide-react';
import { DIFFICULTIES } from '../services/exerciseService';
import { formatDue } from '../utils/format';

export const EXERCISE_STATUS = {
  completado: { label: 'Completado', icon: CheckCircle2, tone: 'success' },
  pendiente: { label: 'Pendiente', icon: Circle, tone: 'info' },
  vencido: { label: 'Vencido', icon: AlertCircle, tone: 'danger' },
};

export default function ExerciseCard({ exercise, topic, status, completedCount, totalStudents, onClick }) {
  const difficulty = DIFFICULTIES[exercise.difficulty] ?? DIFFICULTIES.media;
  const statusInfo = EXERCISE_STATUS[status];
  const StatusIcon = statusInfo?.icon;

  return (
    <button className="exercise-card" onClick={onClick} style={{ '--topic-color': topic?.color ?? '#2563eb' }}>
      <div className="exercise-card__top">
        <span className="tag tag--topic">{topic?.name ?? 'General'}</span>
        <span className={`pill pill--${difficulty.tone}`}>{difficulty.label}</span>
      </div>
      <h3 className="exercise-card__title">{exercise.title}</h3>
      <p className="exercise-card__statement">{exercise.statement}</p>
      <div className="exercise-card__footer">
        <span className="exercise-card__due">
          <CalendarDays size={14} /> {formatDue(exercise.dueDate)}
        </span>
        {statusInfo ? (
          <span className={`status status--${statusInfo.tone}`}>
            <StatusIcon size={14} /> {statusInfo.label}
          </span>
        ) : (
          <span className="status">
            <Users size={14} /> {completedCount}/{totalStudents} entregas
          </span>
        )}
      </div>
    </button>
  );
}
