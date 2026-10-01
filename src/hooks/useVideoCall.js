import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as call from '../services/callService';

const VIDEO_CONSTRAINTS = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } };
const AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
// Bitrate máximo del video: el profesor manda una copia a cada alumno, así que se limita.
const MAX_VIDEO_BITRATE = { teacher: 600_000, student: 300_000 };

/**
 * Videollamada propia (WebRTC) de una clase.
 *
 * Modelo de aula: el profesor transmite a todos; los alumnos miran y escuchan, y
 * cuando el profesor les da la palabra, su micrófono (y cámara, si la prenden) llega a todos.
 * Solo se conectan los pares donde al menos uno transmite, así se ahorra ancho de banda.
 */
export function useVideoCall(sessionId, user, { enabled = true } = {}) {
  const me = user.id;
  const isTeacher = user.role === 'teacher';
  const [callState, setCallState] = useState({ live: null, members: {}, hands: {}, speakers: {} });
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState({}); // uid -> { stream, version }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [error, setError] = useState('');
  const peers = useRef(new Map());
  const latest = useRef({});
  latest.current = { localStream, callState, joined, user };

  useEffect(() => (enabled ? call.watchCall(sessionId, setCallState) : undefined), [enabled, sessionId]);

  const { live, members, hands, speakers } = callState;
  const isSpeaking = Boolean(speakers[me]);
  const iSend = isTeacher ? live?.by === me : isSpeaking;
  const isSender = useCallback((uid) => live?.by === uid || Boolean(speakers[uid]), [live, speakers]);

  /* ---------- Conexiones con cada participante ---------- */

  const sendSignal = useCallback((to, kind, data) => call.sendSignal(sessionId, me, to, kind, data).catch(() => {}), [sessionId, me]);

  const refreshRemote = useCallback((uid, stream) => {
    setRemoteStreams((previous) => ({ ...previous, [uid]: { stream, version: (previous[uid]?.version ?? 0) + 1 } }));
  }, []);

  const limitBitrate = useCallback(
    (entry) => {
      entry.pc.getSenders().forEach((sender) => {
        if (sender.track?.kind !== 'video') return;
        const params = sender.getParameters();
        if (!params.encodings?.length) return;
        params.encodings[0].maxBitrate = isTeacher ? MAX_VIDEO_BITRATE.teacher : MAX_VIDEO_BITRATE.student;
        sender.setParameters(params).catch(() => {});
      });
    },
    [isTeacher],
  );

  const getPeer = useCallback(
    (uid) => {
      const existing = peers.current.get(uid);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: call.iceServers() });
      // "Negociación perfecta": si los dos ofrecen a la vez, el "educado" cede.
      const entry = { pc, polite: me > uid, makingOffer: false, ignoreOffer: false, senders: new Map(), pendingCandidates: [] };
      peers.current.set(uid, entry);

      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          sendSignal(uid, 'description', pc.localDescription.toJSON());
        } catch (err) {
          console.error('Videollamada: no se pudo negociar', err);
        } finally {
          entry.makingOffer = false;
        }
      };
      pc.onicecandidate = ({ candidate }) => candidate && sendSignal(uid, 'candidate', candidate.toJSON());
      pc.ontrack = ({ track, streams }) => {
        const stream = streams[0] ?? new MediaStream([track]);
        const refresh = () => refreshRemote(uid, stream);
        stream.onaddtrack = refresh;
        stream.onremovetrack = refresh;
        track.onmute = refresh;
        track.onunmute = refresh;
        refresh();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') pc.restartIce();
        if (pc.connectionState === 'connected') limitBitrate(entry);
      };
      return entry;
    },
    [me, sendSignal, refreshRemote, limitBitrate],
  );

  const closePeer = useCallback((uid) => {
    const entry = peers.current.get(uid);
    if (!entry) return;
    entry.pc.close();
    peers.current.delete(uid);
    setRemoteStreams((previous) => {
      if (!previous[uid]) return previous;
      const next = { ...previous };
      delete next[uid];
      return next;
    });
  }, []);

  const handleSignal = useCallback(
    async ({ from, kind, data }) => {
      const entry = getPeer(from);
      const { pc } = entry;
      try {
        if (kind === 'description') {
          const offerCollision = data.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable');
          entry.ignoreOffer = !entry.polite && offerCollision;
          if (entry.ignoreOffer) return;
          await pc.setRemoteDescription(data);
          for (const candidate of entry.pendingCandidates.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
          if (data.type === 'offer') {
            await pc.setLocalDescription();
            sendSignal(from, 'description', pc.localDescription.toJSON());
          }
        } else if (kind === 'candidate') {
          if (!pc.remoteDescription) entry.pendingCandidates.push(data);
          else await pc.addIceCandidate(data).catch((err) => !entry.ignoreOffer && console.warn(err));
        }
      } catch (err) {
        console.error('Videollamada: mensaje de conexión inválido', err);
      }
    },
    [getPeer, sendSignal],
  );

  // Mensajes de conexión recibidos: se procesan en orden y se borran.
  useEffect(() => {
    if (!enabled || !joined) return undefined;
    const processed = new Set();
    let chain = Promise.resolve();
    return call.watchInbox(sessionId, me, (messages) => {
      const fresh = messages.filter((message) => !processed.has(message.key));
      if (!fresh.length) return;
      fresh.forEach((message) => {
        processed.add(message.key);
        chain = chain.then(() => handleSignal(message));
      });
      call.clearSignals(sessionId, me, fresh.map((message) => message.key));
    });
  }, [enabled, joined, sessionId, me, handleSignal]);

  // Con quién conectarse: con todos si yo transmito; si no, solo con quienes transmiten.
  const desiredPeers = useMemo(() => {
    if (!joined) return [];
    return Object.keys(members).filter((uid) => uid !== me && (iSend || isSender(uid)));
  }, [joined, members, me, iSend, isSender]);

  useEffect(() => {
    desiredPeers.forEach((uid) => getPeer(uid));
    [...peers.current.keys()].forEach((uid) => !desiredPeers.includes(uid) && closePeer(uid));
  }, [desiredPeers, getPeer, closePeer]);

  // Mis pistas de audio y video, agregadas o quitadas de cada conexión.
  useEffect(() => {
    const tracks = iSend && localStream ? localStream.getTracks() : [];
    peers.current.forEach((entry) => {
      tracks.forEach((track) => {
        if (!entry.senders.has(track.id)) entry.senders.set(track.id, entry.pc.addTrack(track, localStream));
      });
      entry.senders.forEach((sender, trackId) => {
        if (tracks.some((track) => track.id === trackId)) return;
        try {
          entry.pc.removeTrack(sender);
        } catch {
          /* la conexión ya estaba cerrada */
        }
        entry.senders.delete(trackId);
      });
    });
  }, [desiredPeers, localStream, mediaVersion, iSend]);

  /* ---------- Cámara y micrófono propios ---------- */

  const acquire = useCallback(async (withVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: withVideo ? VIDEO_CONSTRAINTS : false });
      setLocalStream(stream);
      setMicOn(true);
      setCamOn(stream.getVideoTracks().length > 0);
      setError('');
      return stream;
    } catch (err) {
      if (withVideo) return acquire(false); // sin cámara (o sin permiso): se intenta solo con micrófono
      console.error(err);
      setError('No se pudo usar el micrófono. Revisá los permisos del navegador (el ícono del candado, arriba a la izquierda).');
      return null;
    }
  }, []);

  const stopLocal = useCallback(() => {
    latest.current.localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setCamOn(false);
  }, []);

  // Al alumno que recibe la palabra se le prende el micrófono; al perderla, se apaga.
  useEffect(() => {
    if (isTeacher || !joined) return;
    if (isSpeaking && !latest.current.localStream) acquire(false);
    if (!isSpeaking && latest.current.localStream) stopLocal();
  }, [isSpeaking, joined, isTeacher, acquire, stopLocal]);

  const toggleMic = useCallback(() => {
    const tracks = latest.current.localStream?.getAudioTracks() ?? [];
    const next = !tracks.some((track) => track.enabled);
    tracks.forEach((track) => (track.enabled = next));
    setMicOn(next);
  }, []);

  const toggleCam = useCallback(async () => {
    const stream = latest.current.localStream;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length) {
      videoTracks.forEach((track) => {
        track.stop();
        stream.removeTrack(track);
      });
      setCamOn(false);
    } else {
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        camera.getVideoTracks().forEach((track) => stream.addTrack(track));
        setCamOn(true);
      } catch {
        setError('No se pudo prender la cámara. Revisá los permisos del navegador.');
        return;
      }
    }
    setMediaVersion((version) => version + 1);
  }, []);

  /* ---------- Acciones ---------- */

  const join = useCallback(async () => {
    try {
      await call.joinCall(sessionId, latest.current.user);
      setJoined(true);
    } catch (err) {
      console.error(err);
      setError('No se pudo entrar a la videollamada.');
    }
  }, [sessionId]);

  const leave = useCallback(() => {
    [...peers.current.keys()].forEach(closePeer);
    stopLocal();
    setJoined(false);
    call.leaveCall(sessionId, me);
  }, [sessionId, me, closePeer, stopLocal]);

  const startBroadcast = useCallback(async () => {
    const stream = await acquire(true);
    if (!stream) return;
    if (!latest.current.joined) await join();
    await call.setLive(sessionId, latest.current.user, true);
  }, [acquire, join, sessionId]);

  const stopBroadcast = useCallback(async () => {
    await call.setLive(sessionId, latest.current.user, false);
    stopLocal();
  }, [sessionId, stopLocal]);

  const toggleHand = useCallback(() => call.setHand(sessionId, me, !latest.current.callState.hands[me]), [sessionId, me]);
  const setSpeaker = useCallback((uid, speaking) => call.setSpeaker(sessionId, uid, speaking), [sessionId]);

  // Al salir de la pizarra: se corta todo y, si el profesor transmitía, termina la transmisión.
  useEffect(
    () => () => {
      const { callState: state, user: currentUser, joined: wasJoined } = latest.current;
      peers.current.forEach((entry) => entry.pc.close());
      peers.current.clear();
      latest.current.localStream?.getTracks().forEach((track) => track.stop());
      if (state.live?.by === currentUser.id) call.setLive(sessionId, currentUser, false).catch(() => {});
      if (wasJoined) call.leaveCall(sessionId, currentUser.id);
    },
    [sessionId],
  );

  return {
    live,
    members,
    hands,
    speakers,
    joined,
    isSpeaking,
    handRaised: Boolean(hands[me]),
    localStream,
    mediaVersion,
    remoteStreams,
    micOn,
    camOn,
    error,
    join,
    leave,
    startBroadcast,
    stopBroadcast,
    toggleMic,
    toggleCam,
    toggleHand,
    setSpeaker,
  };
}
