import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getState } from '../services/store';
import { createSession } from '../services/classService';
import { todayLabel } from '../utils/format';

/**
 * "Abrir en pizarra":
 *  - Profesor: usa la clase en vivo de ese tema si ya existe; si no, crea una nueva.
 *  - Alumno: lo abre en su pizarra personal de práctica.
 * El contenido se inserta al entrar a la pizarra (se pasa en el state de la navegación).
 */
export function useOpenInWhiteboard() {
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    async (item, topicId) => {
      if (!isTeacher) {
        navigate(`/pizarra/practica-${user.id}`, { state: { insert: item } });
        return;
      }
      const state = getState();
      const topic = state.topics.find((t) => t.id === topicId);
      let session = state.sessions.find((s) => s.active && s.ownerId === user.id && s.topicId === (topicId ?? null));
      if (!session) {
        session = await createSession({ title: `Clase - ${topic?.name ?? 'Física'} ${todayLabel()}`, topicId }, user);
      }
      navigate(`/pizarra/${session.id}`, { state: { insert: item } });
    },
    [isTeacher, navigate, user],
  );
}
