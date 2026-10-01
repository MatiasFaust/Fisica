import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Radio, PenLine, Presentation, ArrowRight, Power, Trash2, RotateCcw, Lightbulb, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ActionMenu from '../components/ui/ActionMenu';
import ClassFormModal from '../components/modals/ClassFormModal';
import { createSession, deleteSession, endSession, reopenSession } from '../services/classService';
import { sendBoardOp } from '../services/realtimeService';
import { formatRelative, todayLabel } from '../utils/format';

export default function WhiteboardLobbyPage() {
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const live = state.sessions.filter((s) => s.active);
  const finished = state.sessions.filter((s) => !s.active);
  const topicOf = (session) => state.topics.find((t) => t.id === session.topicId);

  const setEnded = (sessionId, ended) => {
    // Avisa a quien tenga la pizarra abierta que la clase terminó o se reabrió.
    sendBoardOp(sessionId, { type: 'end', ended }, user);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Clases"
        title="Pizarra en vivo"
        subtitle={isTeacher ? 'Creá una clase y tus alumnos podrán ver y escribir en la misma pizarra en tiempo real.' : 'Entrá a la clase en vivo o practicá en tu propia pizarra.'}
        actions={
          isTeacher && (
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} /> Nueva clase
            </button>
          )
        }
      />

      <section className="section">
        <h2 className="section__title">
          <Radio size={18} /> Clases en vivo
        </h2>
        {live.length ? (
          <div className="grid grid--sessions">
            {live.map((session) => {
              const topic = topicOf(session);
              return (
                <div key={session.id} className="session-card" style={{ '--topic-color': topic?.color ?? '#2563eb' }}>
                  <div className="session-card__top">
                    <span className="live-badge">
                      <span className="live-dot" /> EN VIVO
                    </span>
                    {isTeacher && (
                      <ActionMenu
                        items={[
                          {
                            label: 'Terminar clase',
                            icon: Power,
                            onClick: async () => {
                              setEnded(session.id, true);
                              await endSession(session.id);
                              toast.success('Clase terminada');
                            },
                          },
                          { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => deleteSession(session.id) },
                        ]}
                      />
                    )}
                  </div>
                  <h3>{session.title}</h3>
                  <p className="muted">
                    {topic?.name ?? 'Sin tema'} · empezó {formatRelative(session.createdAt)}
                  </p>
                  <Link to={`/pizarra/${session.id}`} className="btn btn--primary btn--block">
                    Entrar a la pizarra <ArrowRight size={17} />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Presentation}
            title="No hay clases en vivo ahora"
            text={isTeacher ? 'Creá una clase para empezar a escribir con tus alumnos.' : 'Cuando el profesor empiece una clase, va a aparecer acá.'}
            action={
              isTeacher && (
                <button className="btn btn--primary" onClick={() => setCreating(true)}>
                  <Plus size={18} /> Nueva clase
                </button>
              )
            }
          />
        )}
      </section>

      <section className="section">
        <div className="practice-card">
          <span className="practice-card__icon">
            <PenLine size={24} />
          </span>
          <div>
            <h3>Mi pizarra personal</h3>
            <p>Un espacio propio para practicar, hacer cuentas o preparar una clase. Solo lo ves vos.</p>
          </div>
          <Link to={`/pizarra/practica-${user.id}`} className="btn btn--soft">
            Abrir <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {isTeacher && finished.length > 0 && (
        <section className="section">
          <h2 className="section__title">
            <History size={18} /> Clases terminadas
          </h2>
          <div className="saved-list">
            {finished.map((session) => (
              <div key={session.id} className="saved-class">
                <div className="saved-class__main">
                  <span className="saved-class__icon">
                    <Presentation size={20} />
                  </span>
                  <span className="saved-class__text">
                    <strong>{session.title}</strong>
                    <span>{topicOf(session)?.name ?? 'Sin tema'} · terminó {formatRelative(session.endedAt ?? session.createdAt)}</span>
                  </span>
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={async () => {
                    setEnded(session.id, false);
                    await reopenSession(session.id);
                    navigate(`/pizarra/${session.id}`);
                  }}
                >
                  <RotateCcw size={15} /> Reabrir
                </button>
                <ActionMenu items={[{ label: 'Eliminar', icon: Trash2, danger: true, onClick: () => deleteSession(session.id) }]} />
              </div>
            ))}
          </div>
          <p className="muted section__note">
            Las clases que guardaste están en <Link to="/repositorio/clases-guardadas">Repositorio › Clases guardadas</Link>.
          </p>
        </section>
      )}

      <aside className="tip">
        <Lightbulb size={18} />
        <p>
          <strong>Probá el tiempo real:</strong> abrí esta página en otra pestaña o ventana, ingresá como {isTeacher ? 'alumno' : 'profesor'} y entrá a la misma clase. Lo que
          escribas en una se verá en la otra al instante.
        </p>
      </aside>

      <ClassFormModal
        open={creating}
        title="Nueva clase en vivo"
        subtitle="Los alumnos la verán en «Pizarra en vivo»."
        confirmLabel="Crear y entrar"
        initialTitle={`Clase - ${todayLabel()}`}
        topics={state.topics}
        onClose={() => setCreating(false)}
        onSubmit={async (form) => {
          const topic = state.topics.find((t) => t.id === form.topicId);
          const title = form.title === `Clase - ${todayLabel()}` && topic ? `Clase - ${topic.name} ${todayLabel()}` : form.title;
          const session = await createSession({ title, topicId: form.topicId }, user);
          navigate(`/pizarra/${session.id}`);
        }}
      />
    </div>
  );
}
