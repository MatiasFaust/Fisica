import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FilePlus2, Users, Save, Power, Lock, UserX, Flag, Radio, PenLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import { useBoardSession } from '../hooks/useBoardSession';
import { useFileActions } from '../hooks/useFileActions';
import Whiteboard from '../components/whiteboard/Whiteboard';
import WhiteboardToolbar, { TOOLS } from '../components/whiteboard/WhiteboardToolbar';
import InsertModal from '../components/whiteboard/InsertModal';
import ParticipantsPanel from '../components/whiteboard/ParticipantsPanel';
import { buildInsertObjects } from '../components/whiteboard/insertContent';
import LiveUsers from '../components/LiveUsers';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ClassFormModal from '../components/modals/ClassFormModal';
import { canDraw } from '../services/boardOps';
import { endSession, saveClass } from '../services/classService';
import { getState } from '../services/store';
import { uid } from '../utils/id';

export default function WhiteboardPage() {
  const { sessionId } = useParams();
  const { user, isTeacher } = useAuth();
  const { sessions } = useStore();
  const session = sessions.find((s) => s.id === sessionId);
  const isPractice = sessionId === `practica-${user.id}`;

  if (!session && !isPractice) {
    return <BoardMessage icon={Flag} title="La clase no existe" text="Puede que el profesor la haya eliminado." />;
  }
  if (session && !session.active && !isTeacher) {
    return <BoardMessage icon={Flag} title="La clase terminó" text="Si el profesor la guardó, podés repasarla en Repositorio › Clases guardadas." showSaved />;
  }
  return <BoardRoom key={sessionId} sessionId={sessionId} session={session} isPractice={isPractice} />;
}

function BoardMessage({ icon: Icon, title, text, showSaved }) {
  return (
    <div className="board-message">
      <div className="board-message__card">
        <span className="board-message__icon">
          <Icon size={28} />
        </span>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="board-message__actions">
          {showSaved && (
            <Link to="/repositorio/clases-guardadas" className="btn btn--primary">
              Ver clases guardadas
            </Link>
          )}
          <Link to="/pizarra" className="btn btn--ghost">
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}

function BoardRoom({ sessionId, session, isPractice }) {
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileActions = useFileActions();
  const state = useStore();
  const boardRef = useRef(null);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#0f2a4a');
  const [size, setSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [pageId, setPageId] = useState(null);
  const [panel, setPanel] = useState(false);
  const [insertTab, setInsertTab] = useState(null);
  const [dialog, setDialog] = useState(null); // 'save' | 'end' | 'clear' | {kick}
  const [removed, setRemoved] = useState(null); // 'kicked' | 'ended'

  const isHost = isTeacher || isPractice;

  const handleOp = useCallback(
    (op, author) => {
      if (author?.id === user.id) return;
      if (op.type === 'addPage') {
        setPageId(op.pageId);
        toast.info(`${author.name} creó una hoja nueva`);
      }
      if (op.type === 'kick' && op.userId === user.id) setRemoved('kicked');
      if (op.type === 'end' && op.ended && !isTeacher) setRemoved('ended');
      if (op.type === 'permission' && op.userId === user.id) toast.info(op.allowed ? 'El profesor te habilitó para escribir' : 'El profesor bloqueó tu escritura');
      if (op.type === 'lockAll' && !isTeacher) toast.info(op.locked ? 'El profesor bloqueó la escritura' : 'Ya podés escribir en la pizarra');
    },
    [user.id, isTeacher, toast],
  );

  const { board, participants, remoteRef, send, addObjects, clearPage, undo, redo, canUndo, canRedo, sendCursor, sendDraft } = useBoardSession(sessionId, user, {
    enabled: !removed,
    onOp: handleOp,
    onRemoteActivity: () => boardRef.current?.requestRender(),
    onError: (message) => toast.error(message),
  });

  // El profesor puede terminar la clase desde otra pantalla: lo detectamos por la base de datos.
  useEffect(() => {
    if (session && !session.active && !isTeacher) setRemoved('ended');
  }, [session, isTeacher]);

  // Un alumno expulsado que vuelve a entrar ve el aviso en lugar de la pizarra.
  useEffect(() => {
    if (!isTeacher && board.kicked?.includes(user.id)) setRemoved('kicked');
  }, [board.kicked, isTeacher, user.id]);

  const pageIndex = Math.max(0, board.pages.findIndex((page) => page.id === pageId));
  const page = board.pages[pageIndex];
  const allowedToDraw = canDraw(board, user) && !removed;

  useEffect(() => {
    if (!allowedToDraw && tool !== 'hand') setTool('hand');
  }, [allowedToDraw, tool]);

  /* ---------- Insertar contenido ---------- */

  const insert = useCallback(
    async (item) => {
      try {
        const center = boardRef.current?.getViewCenter() ?? { x: 400, y: 300 };
        const objects = await buildInsertObjects(item, center, getState(), user);
        if (objects.length) {
          addObjects(page.id, objects);
          setTool('pen');
        }
      } catch (error) {
        toast.error(error.message);
      }
    },
    [addObjects, page.id, toast, user],
  );

  // "Abrir en pizarra" desde otra pantalla llega como state de la navegación.
  const pendingInsert = location.state?.insert;
  useEffect(() => {
    if (!pendingInsert || !allowedToDraw) return undefined;
    const timer = setTimeout(() => {
      insert(pendingInsert);
      navigate(location.pathname, { replace: true, state: null });
    }, 150);
    return () => clearTimeout(timer);
  }, [pendingInsert, allowedToDraw, insert, navigate, location.pathname]);

  /* ---------- Atajos de teclado ---------- */

  useEffect(() => {
    const handleKey = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if (!mod && allowedToDraw) {
        const match = TOOLS.find((item) => item.key === event.key.toLowerCase());
        if (match) setTool(match.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, allowedToDraw]);

  /* ---------- Acciones del profesor ---------- */

  const newPage = () => {
    const id = uid('page-');
    send({ type: 'addPage', pageId: id });
    setPageId(id);
  };

  const handleSave = async ({ title, topicId }) => {
    const saved = await saveClass({ sessionId, title, topicId, pages: board.pages }, user);
    toast.success('Clase guardada en Repositorio › Clases guardadas', {
      action: { label: 'Ver', onClick: () => navigate(`/clases/${saved.id}`) },
    });
    return saved;
  };

  const handleEnd = async (save) => {
    if (save) await handleSave({ title: defaultSaveTitle, topicId: session?.topicId ?? '' });
    send({ type: 'end', ended: true });
    await endSession(sessionId);
    navigate('/pizarra');
  };

  const handleOpenObject = (obj) => {
    if (obj.fileId) {
      const file = getState().files.find((f) => f.id === obj.fileId);
      if (file) fileActions.open(file);
      else toast.error('El archivo ya no está en el repositorio');
    } else if (obj.exerciseId) {
      window.open(`/ejercicios/${obj.exerciseId}`, '_blank');
    }
  };

  const topic = state.topics.find((t) => t.id === session?.topicId);
  const defaultSaveTitle = topic ? `Clase ${topic.name}` : (session?.title ?? 'Clase');
  const title = isPractice ? 'Mi pizarra personal' : session.title;
  const others = participants.filter((p) => p.id !== user.id);

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header__left">
          <Link to="/pizarra" className="icon-btn" aria-label="Volver">
            <ArrowLeft size={20} />
          </Link>
          <div className="board-header__title">
            <h1>{title}</h1>
            <span>
              {isPractice ? (
                'Solo vos ves esta pizarra'
              ) : (
                <>
                  <Radio size={13} className="text-live" /> En vivo{topic ? ` · ${topic.name}` : ''}
                </>
              )}
            </span>
          </div>
        </div>

        {!isPractice && (
          <div className="board-header__center">
            <LiveUsers users={participants} max={6} />
          </div>
        )}

        <div className="board-header__right">
          <div className="page-nav">
            <button className="icon-btn icon-btn--sm" onClick={() => setPageId(board.pages[pageIndex - 1]?.id)} disabled={pageIndex === 0} aria-label="Hoja anterior">
              <ChevronLeft size={18} />
            </button>
            <span>
              <span className="hide-sm">Hoja </span>
              {pageIndex + 1}/{board.pages.length}
            </span>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setPageId(board.pages[pageIndex + 1]?.id)}
              disabled={pageIndex === board.pages.length - 1}
              aria-label="Hoja siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {isHost && (
            <button className="btn btn--ghost btn--sm" onClick={newPage} title="Nueva hoja">
              <FilePlus2 size={17} /> <span className="hide-md">Nueva hoja</span>
            </button>
          )}
          {isTeacher && !isPractice && (
            <>
              <button className={`btn btn--ghost btn--sm ${panel ? 'is-active' : ''}`} onClick={() => setPanel((open) => !open)} title="Participantes">
                <Users size={17} /> <span className="board-count">{others.length}</span>
              </button>
              <button className="btn btn--soft btn--sm" onClick={() => setDialog('save')}>
                <Save size={17} /> <span className="hide-md">Guardar clase</span>
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => setDialog('end')} title="Terminar clase">
                <Power size={17} /> <span className="hide-md">Terminar</span>
              </button>
            </>
          )}
        </div>
      </header>

      {!allowedToDraw && !removed && (
        <div className="board-banner">
          <Lock size={16} /> El profesor bloqueó la escritura. Podés mirar y moverte por la pizarra.
        </div>
      )}

      <div className="board-stage">
        <Whiteboard
          ref={boardRef}
          page={page}
          tool={tool}
          color={color}
          size={size}
          readOnly={!allowedToDraw}
          userId={user.id}
          remoteRef={remoteRef}
          onCommit={(objects) => addObjects(page.id, objects)}
          onDraft={(obj) => sendDraft(obj ? { pageId: page.id, obj } : null)}
          onCursor={(point) => sendCursor({ ...point, pageId: page.id, name: user.name, color: user.color })}
          onOpenObject={handleOpenObject}
          onZoomChange={setZoom}
        />

        <WhiteboardToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          canDraw={allowedToDraw}
          canUndo={canUndo && allowedToDraw}
          canRedo={canRedo && allowedToDraw}
          onUndo={undo}
          onRedo={redo}
          canClear={isHost}
          onClear={() => setDialog('clear')}
          zoom={zoom}
          onZoomIn={() => boardRef.current?.zoomIn()}
          onZoomOut={() => boardRef.current?.zoomOut()}
          onResetZoom={() => boardRef.current?.resetView()}
          onInsert={setInsertTab}
        />

        {isTeacher && !isPractice && (
          <ParticipantsPanel
            open={panel}
            participants={participants}
            board={board}
            users={state.users}
            onClose={() => setPanel(false)}
            onTogglePermission={(userId, allowed) => send({ type: 'permission', userId, allowed })}
            onKick={(participant) => setDialog({ kick: participant })}
            onReadmit={(userId) => send({ type: 'unkick', userId })}
            onLockAll={(locked) => {
              send({ type: 'lockAll', locked });
              toast.info(locked ? 'Los alumnos ahora solo pueden mirar' : 'Todos los alumnos pueden escribir');
            }}
          />
        )}
      </div>

      <InsertModal open={Boolean(insertTab)} initialTab={insertTab ?? 'exercise'} onClose={() => setInsertTab(null)} onPick={insert} />

      <ClassFormModal
        open={dialog === 'save'}
        title="Guardar clase"
        subtitle="Queda en Repositorio › Clases guardadas para que los alumnos la repasen."
        confirmLabel="Guardar"
        initialTitle={defaultSaveTitle}
        initialTopicId={session?.topicId ?? ''}
        topics={state.topics}
        onClose={() => setDialog(null)}
        onSubmit={handleSave}
      />

      <Modal
        open={dialog === 'end'}
        title="Terminar clase"
        size="sm"
        onClose={() => setDialog(null)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => handleEnd(false)}>
              Terminar sin guardar
            </button>
            <button className="btn btn--primary" onClick={() => handleEnd(true)}>
              <Save size={16} /> Guardar y terminar
            </button>
          </>
        }
      >
        <p className="muted">Los alumnos verán que la clase terminó. ¿Querés guardarla antes para que puedan repasarla?</p>
      </Modal>

      <ConfirmDialog
        open={dialog === 'clear'}
        title="Borrar pizarra"
        message="Se borra todo el contenido de esta hoja para todos los participantes. Podés recuperarlo con «Deshacer»."
        confirmLabel="Borrar hoja"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => clearPage(page.id)}
      />

      <ConfirmDialog
        open={Boolean(dialog?.kick)}
        title="Expulsar alumno"
        message={`${dialog?.kick?.name ?? ''} va a salir de la clase y no podrá volver a entrar a menos que lo readmitas.`}
        confirmLabel="Expulsar"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          send({ type: 'kick', userId: dialog.kick.id });
          toast.success(`${dialog.kick.name} fue quitado de la clase`);
        }}
      />

      {removed && (
        <div className="board-overlay">
          <div className="board-message__card">
            <span className="board-message__icon">{removed === 'kicked' ? <UserX size={28} /> : <PenLine size={28} />}</span>
            <h1>{removed === 'kicked' ? 'Saliste de la clase' : 'La clase terminó'}</h1>
            <p>{removed === 'kicked' ? 'El profesor te quitó de la sesión.' : 'Si el profesor la guardó, la vas a encontrar en Clases guardadas.'}</p>
            <div className="board-message__actions">
              <Link to="/repositorio/clases-guardadas" className="btn btn--primary">
                Clases guardadas
              </Link>
              <Link to="/inicio" className="btn btn--ghost">
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
