import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  FileText,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Clock,
  PenLine,
  Radio,
  ArrowRight,
  Upload,
  Presentation,
  Save,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../hooks/useStore';
import { useFileActions } from '../hooks/useFileActions';
import FileCard from '../components/FileCard';
import TopicIcon from '../components/TopicIcon';
import UserAvatar from '../components/UserAvatar';
import EmptyState from '../components/ui/EmptyState';
import { getSubmission, DIFFICULTIES } from '../services/exerciseService';
import { getPendingStudents, getStudents } from '../services/studentService';
import { getTopicForFolder } from '../services/repositoryService';
import { formatDue, formatLongDate, formatRelative, daysUntil } from '../utils/format';

const ACTIVITY_ICONS = { upload: Upload, class: Presentation, submission: CheckCircle2, exercise: ClipboardList, topic: BookOpen, save: Save };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 13) return 'Buen día';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function StatTile({ icon: Icon, label, value, tone = 'blue' }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__icon">
        <Icon size={20} />
      </span>
      <div>
        <strong className="stat__value">{value}</strong>
        <span className="stat__label">{label}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();
  const fileActions = useFileActions();

  const publicFiles = useMemo(() => state.files.filter((file) => file.visibility !== 'private'), [state.files]);
  const latestFiles = useMemo(() => [...publicFiles].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5), [publicFiles]);
  const liveSession = state.sessions.find((session) => session.active);
  const students = getStudents(state);
  const pendingRequests = isTeacher ? getPendingStudents(state).length : 0;

  const upcoming = useMemo(() => {
    return [...state.exercises]
      .filter((exercise) => daysUntil(exercise.dueDate) >= 0)
      .filter((exercise) => isTeacher || !getSubmission(state, exercise.id, user.id))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);
  }, [state, isTeacher, user.id]);

  const recentTopics = useMemo(() => {
    // Un tema es "reciente" según el último archivo o ejercicio publicado en él.
    const lastUse = (topic) => {
      const files = publicFiles.filter((file) => getTopicForFolder(state, file.folderId)?.id === topic.id).map((file) => file.uploadedAt);
      const exercises = state.exercises.filter((ex) => ex.topicId === topic.id).map((ex) => ex.createdAt);
      return [...files, ...exercises, topic.createdAt ?? ''].sort().pop();
    };
    return [...state.topics].map((topic) => ({ topic, at: lastUse(topic) })).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  }, [state, publicFiles]);

  const myCompleted = state.submissions.filter((sub) => sub.studentId === user.id).length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const stats = isTeacher
    ? [
        { icon: FileText, label: 'Archivos publicados', value: publicFiles.length, tone: 'blue' },
        { icon: BookOpen, label: 'Temas', value: state.topics.length, tone: 'violet' },
        { icon: ClipboardList, label: 'Ejercicios', value: state.exercises.length, tone: 'amber' },
        { icon: CheckCircle2, label: 'Entregas esta semana', value: state.submissions.filter((s) => s.submittedAt > weekAgo).length, tone: 'green' },
      ]
    : [
        { icon: Clock, label: 'Ejercicios pendientes', value: state.exercises.length - myCompleted, tone: 'amber' },
        { icon: CheckCircle2, label: 'Completados', value: myCompleted, tone: 'green' },
        { icon: Presentation, label: 'Clases guardadas', value: state.savedClasses.length, tone: 'violet' },
        { icon: FileText, label: 'Archivos nuevos (7 días)', value: publicFiles.filter((f) => f.uploadedAt > weekAgo).length, tone: 'blue' },
      ];

  return (
    <div className="page dashboard">
      <section className="welcome">
        <div>
          <p className="eyebrow">{formatLongDate(new Date())}</p>
          <h1>
            {greeting()}, {user.name} <span className="wave">👋</span>
          </h1>
          <p className="welcome__meta">
            <span className="tag tag--subject">
              <Sparkles size={14} /> Materia: Física
            </span>
            {isTeacher ? `${students.length} alumnos en el curso` : 'Profesor Martín'}
          </p>
        </div>
        <div className="welcome__actions">
          <Link to="/repositorio" className="btn btn--primary">
            <FolderOpen size={18} /> Ir al repositorio
          </Link>
        </div>
      </section>

      {pendingRequests > 0 && (
        <Link to="/alumnos" className="request-banner">
          <UserPlus size={20} />
          <span>
            <strong>
              {pendingRequests === 1 ? '1 alumno pidió' : `${pendingRequests} alumnos pidieron`} acceso al curso
            </strong>
            Revisá y aprobá las solicitudes.
          </span>
          <ArrowRight size={18} />
        </Link>
      )}

      {liveSession && (
        <Link to={`/pizarra/${liveSession.id}`} className="live-banner">
          <span className="live-banner__icon">
            <Radio size={20} />
          </span>
          <span className="live-banner__text">
            <strong>Clase en vivo ahora</strong>
            <span>{liveSession.title}</span>
          </span>
          <span className="btn btn--light btn--sm">
            Entrar a la pizarra <ArrowRight size={16} />
          </span>
        </Link>
      )}

      <section className="stats">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      <div className="dashboard__grid">
        <div className="dashboard__main">
          <section className="card">
            <header className="card__header">
              <h2>Últimos archivos subidos</h2>
              <Link to="/repositorio" className="link">
                Ver repositorio <ArrowRight size={15} />
              </Link>
            </header>
            <div className="file-list file-list--compact">
              {latestFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  topicName={getTopicForFolder(state, file.folderId)?.name}
                  onOpen={() => fileActions.open(file)}
                  onDownload={() => fileActions.download(file)}
                />
              ))}
            </div>
          </section>

          <section className="card">
            <header className="card__header">
              <h2>{isTeacher ? 'Próximas entregas' : 'Próximas tareas'}</h2>
              <Link to="/ejercicios" className="link">
                Ver ejercicios <ArrowRight size={15} />
              </Link>
            </header>
            {upcoming.length ? (
              <ul className="task-list">
                {upcoming.map((exercise) => {
                  const topic = state.topics.find((t) => t.id === exercise.topicId);
                  const delivered = state.submissions.filter((sub) => sub.exerciseId === exercise.id).length;
                  const urgent = daysUntil(exercise.dueDate) <= 2;
                  return (
                    <li key={exercise.id}>
                      <button className="task" onClick={() => navigate(`/ejercicios/${exercise.id}`)}>
                        <span className="task__bar" style={{ background: topic?.color }} />
                        <span className="task__text">
                          <strong>{exercise.title}</strong>
                          <span>
                            {topic?.name} · {DIFFICULTIES[exercise.difficulty]?.label}
                          </span>
                        </span>
                        <span className={`task__due ${urgent ? 'is-urgent' : ''}`}>{formatDue(exercise.dueDate)}</span>
                        {isTeacher && (
                          <span className="task__count">
                            {delivered}/{students.length}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="¡Todo al día!" text="No hay tareas pendientes por ahora." />
            )}
          </section>
        </div>

        <aside className="dashboard__side">
          <section className="quick-board">
            <PenLine size={26} />
            <h2>Pizarra en vivo</h2>
            <p>{isTeacher ? 'Empezá una clase y resolvé ejercicios junto a tus alumnos.' : 'Sumate a la clase o practicá en tu pizarra personal.'}</p>
            <Link to={liveSession ? `/pizarra/${liveSession.id}` : '/pizarra'} className="btn btn--light">
              {liveSession ? 'Entrar a la clase' : 'Abrir pizarra'} <ArrowRight size={16} />
            </Link>
          </section>

          <section className="card">
            <header className="card__header">
              <h2>Temas recientes</h2>
              <Link to="/temas" className="link">
                Todos
              </Link>
            </header>
            <ul className="topic-list">
              {recentTopics.map(({ topic, at }) => (
                <li key={topic.id}>
                  <Link to={`/temas/${topic.id}`} className="topic-row">
                    <TopicIcon topic={topic} size={18} />
                    <span>
                      <strong>{topic.name}</strong>
                      <span>Actualizado {formatRelative(at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <header className="card__header">
              <h2>Actividad reciente</h2>
            </header>
            <ul className="activity">
              {state.activity.slice(0, 6).map((item) => {
                const author = state.users.find((u) => u.id === item.userId);
                const Icon = ACTIVITY_ICONS[item.type] ?? Sparkles;
                return (
                  <li key={item.id}>
                    <Link to={item.link ?? '#'} className="activity__item">
                      <span className="activity__avatar">
                        <UserAvatar user={author} size={32} />
                        <span className="activity__badge">
                          <Icon size={11} />
                        </span>
                      </span>
                      <span className="activity__text">
                        <span>
                          <strong>{author?.id === user.id ? 'Vos' : author?.displayName}</strong> {item.text}
                        </span>
                        <time>{formatRelative(item.at)}</time>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
