import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Users,
  Save,
  Power,
  Lock,
  UserX,
  Flag,
  Radio,
  PenLine,
  DoorClosed,
  Video,
  VideoOff,
  Settings2,
} from 'lucide-react';
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
import { endSession, saveClass, setSessionVideo } from '../services/classService';
import { openVideoCall, videoLabel } from '../services/videoService';
import VideoCallModal from '../components/modals/VideoCallModal';
import VideoDock from '../components/whiteboard/VideoDock';
import { useVideoCall } from '../hooks/useVideoCall';
import {
  admit,
  ban,
  canSeeSession,
  rejectEntry,
  requestEntry,
  setWaitingRoom,
  unban,
  watchBanned,
  watchConfig,
  watchLobby,
  watchMyEntry,
} from '../services/classAccessService';
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

  const room = <BoardRoom key={sessionId} sessionId={sessionId} session={session} isPractice={isPractice} />;
  if (isTeacher || isPractice) return room;
  if (!canSeeSession(session, user)) {
    return <BoardMessage icon={Lock} title="Esta clase es para otro grupo" text="El profesor no te incluyó en esta clase. Si creés que es un error, avisale." />;
  }
  return (
    <StudentGate key={sessionId} sessionId={sessionId} session={session}>
      {room}
    </StudentGate>
  );
}

function BoardMessage({ icon: Icon, title, text, showSaved, children }) {
  return (
    <div className="board-message">
      <div className="board-message__card">
        <span className="board-message__icon">
          <Icon size={28} />
        </span>
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
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

/**
 * Control de entrada del alumno: sala de espera y expulsiones.
 * Sigue escuchando mientras el alumno está en la pizarra, así una expulsión lo saca al instante.
 */
function StudentGate({ sessionId, session, children }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const [entry, setEntry] = useState({ ready: false });

  useEffect(() => watchMyEntry(sessionId, user.id, setEntry), [sessionId, user.id]);

  const mustWait = entry.ready && entry.waiting && !entry.admitted && !entry.banned;
  // Mientras espera, el alumno figura en la sala de espera del profesor.
  useEffect(() => (mustWait ? requestEntry(sessionId, userRef.current) : undefined), [mustWait, sessionId]);

  if (!entry.ready) {
    return (
      <div className="splash">
        <p>Entrando a la clase…</p>
      </div>
    );
  }
  if (entry.banned) {
    return <BoardMessage icon={UserX} title="No podés entrar a esta clase" text="El profesor te quitó de la sesión." />;
  }
  if (mustWait) {
    return (
      <BoardMessage icon={DoorClosed} title="Sala de espera" text={`Le avisamos al profesor que querés entrar a «${session.title}». Esta pantalla se abre sola cuando te deje pasar.`}>
        <div className="waiting-dots" aria-label="Esperando">
          <span />
          <span />
          <span />
        </div>
      </BoardMessage>
    );
  }
  return children;
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

  /* ---------- Videollamada propia (dentro de la pizarra) ---------- */

  const ownVideo = !isPractice && session?.video?.provider === 'propia';
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoMinimized, setVideoMinimized] = useState(false);
  const callApi = useVideoCall(sessionId, user, { enabled: ownVideo && !removed });
  const openVideoDock = useCallback(() => {
    setVideoOpen(true);
    setVideoMinimized(false);
  }, []);

  // El alumno entra a la llamada al abrir el recuadro (y sale al cerrarlo).
  useEffect(() => {
    if (ownVideo && !isTeacher && videoOpen && !callApi.joined) callApi.join();
  }, [ownVideo, isTeacher, videoOpen, callApi.joined, callApi.join]);

  const closeVideoDock = () => {
    setVideoOpen(false);
    callApi.leave();
  };

  // Avisos: el profesor inició la transmisión / te dieron la palabra / alguien levantó la mano.
  const callLive = Boolean(callApi.live);
  const wasLive = useRef(callLive);
  useEffect(() => {
    if (!isTeacher && ownVideo && callLive && !wasLive.current && !videoOpen) {
      toast.info('El profesor inició la videollamada', { action: { label: 'Unirme', onClick: openVideoDock }, duration: 10000 });
    }
    wasLive.current = callLive;
  }, [callLive, isTeacher, ownVideo, videoOpen, openVideoDock, toast]);

  useEffect(() => {
    if (!isTeacher && callApi.isSpeaking) toast.success('Tenés la palabra: tu micrófono está encendido');
  }, [callApi.isSpeaking, isTeacher, toast]);

  const seenHands = useRef(new Set());
  useEffect(() => {
    if (!isTeacher) return;
    Object.keys(callApi.hands).forEach((uid) => {
      if (seenHands.current.has(uid)) return;
      seenHands.current.add(uid);
      const name = callApi.members[uid]?.name ?? 'Un alumno';
      toast.info(`✋ ${name} levantó la mano`, { action: { label: 'Dar la palabra', onClick: () => callApi.setSpeaker(uid, true) }, duration: 10000 });
    });
    seenHands.current.forEach((uid) => !callApi.hands[uid] && seenHands.current.delete(uid));
  }, [callApi.hands, callApi.members, callApi.setSpeaker, isTeacher, toast]);

  // Si el profesor abre o cambia la videollamada durante la clase, se avisa a los alumnos.
  const videoUrl = session?.video?.url;
  const previousVideoUrl = useRef(videoUrl);
  useEffect(() => {
    if (!isTeacher && videoUrl && videoUrl !== previousVideoUrl.current) {
      toast.info('El profesor abrió una videollamada', {
        action: { label: 'Unirme', onClick: () => openVideoCall(session.video, user) },
        duration: 10000,
      });
    }
    previousVideoUrl.current = videoUrl;
  }, [videoUrl, isTeacher, session, user, toast]);

  /* ---------- Sala de espera y expulsados (profesor) ---------- */

  const managesAccess = isTeacher && !isPractice;
  const [lobby, setLobby] = useState([]);
  const [bannedIds, setBannedIds] = useState([]);
  const [accessConfig, setAccessConfig] = useState(null);
  const seenLobby = useRef(new Set());

  useEffect(() => {
    if (!managesAccess) return undefined;
    const stops = [watchLobby(sessionId, setLobby), watchBanned(sessionId, setBannedIds), watchConfig(sessionId, setAccessConfig)];
    return () => stops.forEach((stop) => stop());
  }, [managesAccess, sessionId]);

  // Aviso cuando alguien nuevo pide entrar, con un botón para dejarlo pasar.
  useEffect(() => {
    lobby.forEach((person) => {
      if (seenLobby.current.has(person.id)) return;
      seenLobby.current.add(person.id);
      toast.info(`${person.name} quiere entrar a la clase`, {
        action: { label: 'Dejar pasar', onClick: () => admit(sessionId, [person.id]) },
        duration: 8000,
      });
    });
    const waitingIds = new Set(lobby.map((person) => person.id));
    seenLobby.current.forEach((id) => !waitingIds.has(id) && seenLobby.current.delete(id));
  }, [lobby, sessionId, toast]);

  const kickStudent = async (participant) => {
    send({ type: 'kick', userId: participant.id });
    await ban(sessionId, participant.id).catch(() => toast.error('No se pudo expulsar. Probá de nuevo.'));
    toast.success(`${participant.name} fue quitado de la clase`);
  };

  const readmitStudent = async (userId) => {
    send({ type: 'unkick', userId });
    await unban(sessionId, userId).catch(() => toast.error('No se pudo readmitir. Probá de nuevo.'));
  };

  const bannedUsers = [...new Set([...bannedIds, ...(board.kicked ?? [])])]
    .map((id) => state.users.find((u) => u.id === id))
    .filter(Boolean);

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
          {!isPractice && session?.video && (
            <button
              className="btn btn--video btn--sm"
              onClick={() => (ownVideo ? openVideoDock() : openVideoCall(session.video, user))}
              title={`Videollamada (${videoLabel(session.video)})`}
            >
              {ownVideo && callLive && <span className="live-dot live-dot--red" />}
              <Video size={17} /> <span className="hide-md">Videollamada</span>
            </button>
          )}
          {isTeacher && !isPractice && (
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setDialog('video')}
              title={session?.video ? 'Cambiar videollamada' : 'Agregar videollamada'}
              aria-label={session?.video ? 'Cambiar videollamada' : 'Agregar videollamada'}
            >
              {session?.video ? <Settings2 size={16} /> : <VideoOff size={16} />}
            </button>
          )}
          {isHost && (
            <button className="btn btn--ghost btn--sm" onClick={newPage} title="Nueva hoja">
              <FilePlus2 size={17} /> <span className="hide-md">Nueva hoja</span>
            </button>
          )}
          {isTeacher && !isPractice && (
            <>
              <button className={`btn btn--ghost btn--sm ${panel ? 'is-active' : ''}`} onClick={() => setPanel((open) => !open)} title="Participantes">
                <Users size={17} /> <span className="board-count">{others.length}</span>
                {lobby.length > 0 && (
                  <span className="board-count board-count--waiting" title="Esperando para entrar">
                    {lobby.length} esperando
                  </span>
                )}
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
          <Lock size={16} /> Estás mirando la clase. Si el profesor te da permiso, vas a poder escribir.
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
          // Solo comparte el cursor quien puede escribir (los que miran no ensucian la pizarra ni gastan cuota).
          onCursor={(point) => allowedToDraw && sendCursor({ ...point, pageId: page.id, name: user.name, color: user.color })}
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

        {ownVideo && videoOpen && (
          <div className={`vdock-wrap ${panel ? 'vdock-wrap--shifted' : ''}`}>
            <VideoDock
              callApi={callApi}
              user={user}
              isTeacher={isTeacher}
              minimized={videoMinimized}
              onMinimize={() => setVideoMinimized((value) => !value)}
              onClose={closeVideoDock}
            />
          </div>
        )}

        {isTeacher && !isPractice && (
          <ParticipantsPanel
            open={panel}
            participants={participants}
            board={board}
            waiting={lobby}
            bannedUsers={bannedUsers}
            waitingRoom={accessConfig?.waiting === true}
            onToggleWaitingRoom={(value) => setWaitingRoom(sessionId, value).catch(() => toast.error('No se pudo cambiar la sala de espera.'))}
            onAdmit={(ids) => admit(sessionId, ids).catch(() => toast.error('No se pudo dejar pasar. Probá de nuevo.'))}
            onReject={(id) => rejectEntry(sessionId, id).catch(() => toast.error('No se pudo rechazar. Probá de nuevo.'))}
            onClose={() => setPanel(false)}
            onTogglePermission={(userId, allowed) => send({ type: 'permission', userId, allowed })}
            onKick={(participant) => setDialog({ kick: participant })}
            onReadmit={readmitStudent}
            onLockAll={(locked) => {
              send({ type: 'lockAll', locked });
              toast.info(locked ? 'Los alumnos ahora solo pueden mirar' : 'Todos los alumnos pueden escribir');
            }}
          />
        )}
      </div>

      <InsertModal open={Boolean(insertTab)} initialTab={insertTab ?? 'exercise'} onClose={() => setInsertTab(null)} onPick={insert} />

      {isTeacher && !isPractice && (
        <VideoCallModal
          open={dialog === 'video'}
          session={session}
          onClose={() => setDialog(null)}
          onSave={async (option) => {
            await setSessionVideo(session, option);
            toast.success(option.mode === 'none' ? 'Videollamada quitada' : 'Videollamada lista: tocá «Videollamada» para abrirla');
          }}
        />
      )}

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
        onConfirm={() => kickStudent(dialog.kick)}
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
