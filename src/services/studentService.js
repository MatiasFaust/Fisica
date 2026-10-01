/**
 * Acceso de los alumnos.
 *
 * En modo Firebase cada alumno que crea su cuenta queda "pendiente" hasta que el
 * profesor lo aprueba. Las reglas de seguridad no dejan leer nada a quien no esté
 * aprobado. El estado se guarda en el perfil (Firestore) y, para la pizarra en vivo,
 * también en Realtime Database (members/{uid}), porque sus reglas no pueden leer Firestore.
 */
import { ref, remove, set } from 'firebase/database';
import { isFirebaseConfigured, rtdb } from './firebase';
import { updateState } from './store';

export const STUDENT_STATUS = {
  pending: 'pending',
  approved: 'approved',
  blocked: 'blocked',
};

/** En modo demostración los perfiles no tienen estado: se consideran aprobados. */
export const isActiveStudent = (user) => user.role === 'student' && (user.status ?? STUDENT_STATUS.approved) === STUDENT_STATUS.approved;

export const getStudents = (state) => state.users.filter(isActiveStudent);
export const getPendingStudents = (state) => state.users.filter((user) => user.role === 'student' && user.status === STUDENT_STATUS.pending);
export const getBlockedStudents = (state) => state.users.filter((user) => user.role === 'student' && user.status === STUDENT_STATUS.blocked);

export async function setStudentStatus(userId, status) {
  if (isFirebaseConfigured) {
    const memberRef = ref(rtdb, `members/${userId}`);
    if (status === STUDENT_STATUS.approved) await set(memberRef, true);
    else await remove(memberRef);
  }
  updateState((state) => ({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, status } : user)),
  }));
}
