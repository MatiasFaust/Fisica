import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Hand, PhoneOff, Minus, Volume2, Radio, X, Maximize2 } from 'lucide-react';
import UserAvatar from '../UserAvatar';

/** Un video (o el avatar si no hay cámara). El audio suena aunque no haya imagen. */
function VideoTile({ stream, version, person, label, muted = false, mirror = false, large = false, onBlocked, onRemove }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) video.srcObject = stream ?? null;
    if (stream) video.play().catch(() => onBlocked?.());
  }, [stream, version, onBlocked]);

  const hasVideo = Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted));

  return (
    <div className={`vtile ${large ? 'vtile--large' : ''}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className={mirror ? 'is-mirror' : ''} style={{ opacity: hasVideo ? 1 : 0 }} />
      {!hasVideo && (
        <div className="vtile__placeholder">
          <UserAvatar user={{ ...person, displayName: person?.name }} size={large ? 64 : 36} />
        </div>
      )}
      <span className="vtile__label">{label}</span>
      {onRemove && (
        <button className="vtile__remove" onClick={onRemove} title="Quitar la palabra" aria-label="Quitar la palabra">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Videollamada propia, dentro de la pizarra.
 * El profesor transmite; los alumnos miran y levantan la mano para hablar.
 */
export default function VideoDock({ callApi, user, isTeacher, minimized, onMinimize, onClose }) {
  const { live, members, hands, speakers, joined, isSpeaking, handRaised, localStream, mediaVersion, remoteStreams, micOn, camOn, error } = callApi;
  const [soundBlocked, setSoundBlocked] = useState(false);
  const dockRef = useRef(null);
  const teacherLive = Boolean(live);
  const viewers = Object.keys(members).filter((uid) => uid !== user.id).length;
  const raisedHands = Object.entries(hands)
    .filter(([uid]) => members[uid])
    .sort(([, a], [, b]) => a - b)
    .map(([uid]) => ({ uid, ...members[uid] }));
  const speakerIds = Object.keys(speakers).filter((uid) => members[uid] && uid !== live?.by);

  const unlockSound = () => {
    dockRef.current?.querySelectorAll('video').forEach((video) => video.play().catch(() => {}));
    setSoundBlocked(false);
  };
  const blocked = useCallback(() => setSoundBlocked(true), []);

  // Minimizado: el recuadro queda oculto pero montado, así el audio sigue sonando.
  const pill = minimized && (
      <button className="vdock-pill" onClick={onMinimize} title="Mostrar videollamada">
        {teacherLive && <span className="live-dot live-dot--red" />}
        <Video size={16} /> Videollamada
        {teacherLive && <span className="vdock-pill__count">{viewers + 1}</span>}
        <Maximize2 size={14} />
      </button>
  );

  const myTile = localStream && (
    <VideoTile
      stream={localStream}
      version={mediaVersion}
      person={{ ...user, name: user.name }}
      label={`Vos${micOn ? '' : ' (silenciado)'}`}
      muted
      mirror
      large={isTeacher}
    />
  );

  return (
    <>
    {pill}
    <section className={`vdock ${minimized ? 'is-minimized' : ''}`} ref={dockRef} aria-label="Videollamada" aria-hidden={minimized}>
      <header className="vdock__header">
        <Video size={16} />
        <strong>Videollamada</strong>
        {teacherLive ? (
          <span className="vdock__live">
            <Radio size={12} /> EN VIVO · {viewers + 1}
          </span>
        ) : (
          <span className="vdock__status">sin transmisión</span>
        )}
        <button className="icon-btn icon-btn--sm" onClick={onMinimize} title="Minimizar" aria-label="Minimizar">
          <Minus size={16} />
        </button>
        {!isTeacher && (
          <button className="icon-btn icon-btn--sm" onClick={onClose} title="Salir de la videollamada" aria-label="Salir de la videollamada">
            <X size={16} />
          </button>
        )}
      </header>

      <div className="vdock__body">
        {/* Video principal */}
        {isTeacher ? (
          teacherLive ? (
            myTile
          ) : (
            <div className="vdock__empty">
              <p>Prendé tu cámara y micrófono para que los alumnos de la clase te vean y escuchen.</p>
              <button className="btn btn--primary btn--sm" onClick={callApi.startBroadcast}>
                <Video size={16} /> Iniciar videollamada
              </button>
            </div>
          )
        ) : teacherLive ? (
          <VideoTile
            stream={remoteStreams[live.by]?.stream}
            version={remoteStreams[live.by]?.version}
            person={members[live.by] ?? { name: 'Profesor' }}
            label={members[live.by]?.name ?? 'Profesor'}
            large
            onBlocked={blocked}
          />
        ) : (
          <div className="vdock__empty">
            <p>{joined ? 'La videollamada todavía no empezó. Cuando el profesor la inicie, la vas a ver acá.' : 'Conectando…'}</p>
          </div>
        )}

        {/* Alumnos con la palabra */}
        {(speakerIds.length > 0 || (isSpeaking && !isTeacher)) && (
          <div className="vdock__tiles">
            {!isTeacher && isSpeaking && myTile}
            {speakerIds
              .filter((uid) => uid !== user.id)
              .map((uid) => (
                <VideoTile
                  key={uid}
                  stream={remoteStreams[uid]?.stream}
                  version={remoteStreams[uid]?.version}
                  person={members[uid]}
                  label={members[uid]?.name}
                  onBlocked={blocked}
                  onRemove={isTeacher ? () => callApi.setSpeaker(uid, false) : undefined}
                />
              ))}
          </div>
        )}

        {soundBlocked && (
          <button className="btn btn--primary btn--sm btn--block" onClick={unlockSound}>
            <Volume2 size={16} /> Activar sonido
          </button>
        )}

        {/* Manos levantadas (profesor) */}
        {isTeacher && teacherLive && raisedHands.length > 0 && (
          <ul className="vdock__hands">
            {raisedHands.map((person) => (
              <li key={person.uid}>
                <Hand size={15} className="vdock__hand-icon" />
                <span>{person.name}</span>
                <button className="btn btn--soft btn--sm" onClick={() => callApi.setSpeaker(person.uid, true)}>
                  Dar la palabra
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="vdock__error">{error}</p>}
      </div>

      {/* Controles */}
      {(isTeacher ? teacherLive : true) && (
        <footer className="vdock__controls">
          {(isTeacher || isSpeaking) && localStream && (
            <>
              <button className={`vbtn ${micOn ? '' : 'is-off'}`} onClick={callApi.toggleMic} title={micOn ? 'Silenciar' : 'Activar micrófono'} aria-label={micOn ? 'Silenciar' : 'Activar micrófono'}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button className={`vbtn ${camOn ? '' : 'is-off'}`} onClick={callApi.toggleCam} title={camOn ? 'Apagar cámara' : 'Prender cámara'} aria-label={camOn ? 'Apagar cámara' : 'Prender cámara'}>
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </>
          )}
          {!isTeacher && !isSpeaking && teacherLive && (
            <button className={`vbtn vbtn--wide ${handRaised ? 'is-active' : ''}`} onClick={callApi.toggleHand}>
              <Hand size={17} /> {handRaised ? 'Bajar la mano' : 'Levantar la mano'}
            </button>
          )}
          {!isTeacher && isSpeaking && (
            <button className="vbtn vbtn--wide" onClick={() => callApi.setSpeaker(user.id, false)}>
              Dejar de hablar
            </button>
          )}
          {isTeacher && (
            <button className="vbtn vbtn--danger vbtn--wide" onClick={callApi.stopBroadcast}>
              <PhoneOff size={17} /> Cortar video
            </button>
          )}
        </footer>
      )}
    </section>
    </>
  );
}
