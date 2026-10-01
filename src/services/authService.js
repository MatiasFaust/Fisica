/**
 * Autenticación.
 *  - Modo demostración: se elige un usuario de prueba. Se usa sessionStorage para
 *    que cada pestaña pueda tener un usuario distinto.
 *  - Modo Firebase: cuentas reales con email y contraseña. La cuenta cuyo email
 *    coincide con VITE_TEACHER_EMAIL es la del profesor; el resto son alumnos,
 *    que quedan pendientes hasta que el profesor los aprueba.
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, TEACHER_EMAIL } from './firebase';
import { getState, updateState } from './store';
import { STUDENT_STATUS } from './studentService';

const SESSION_KEY = 'fisica-session-user';
const AVATAR_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#16a34a', '#ea580c'];

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos.',
  'auth/network-request-failed': 'Sin conexión a internet.',
};

const friendlyError = (error) => new Error(AUTH_ERRORS[error.code] ?? 'No se pudo completar la operación.');

/* ---------- Modo demostración ---------- */

export function getCurrentUserId() {
  if (isFirebaseConfigured) return null;
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function loginDemo(userId) {
  const user = getState().users.find((item) => item.id === userId);
  if (!user) throw new Error('Usuario no encontrado');
  sessionStorage.setItem(SESSION_KEY, userId);
  return user;
}

/* ---------- Modo Firebase ---------- */

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function login(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw friendlyError(error);
  }
}

/**
 * Escucha el perfil propio. callback(perfil | null si todavía no existe).
 * Solo informa datos confirmados por el servidor: si no, al registrarse el perfil
 * figuraría "aprobado" antes de existir en la base y las reglas rechazarían las lecturas.
 */
export function watchProfile(uid, callback) {
  return onSnapshot(
    doc(db, 'users', uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      callback(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null);
    },
    (error) => console.error('No se pudo leer el perfil', error),
  );
}

/** Crea el perfil en Firestore para una cuenta de Authentication (si todavía no lo tiene). */
export async function createProfile(firebaseUser, name) {
  const profileRef = doc(db, 'users', firebaseUser.uid);
  if ((await getDoc(profileRef)).exists()) return;
  const email = firebaseUser.email.toLowerCase();
  const isTeacher = Boolean(TEACHER_EMAIL) && email === TEACHER_EMAIL;
  const cleanName = (name || email.split('@')[0]).trim();
  const profile = {
    name: cleanName,
    displayName: isTeacher ? `Profesor ${cleanName}` : cleanName,
    role: isTeacher ? 'teacher' : 'student',
    status: isTeacher ? STUDENT_STATUS.approved : STUDENT_STATUS.pending,
    email,
    color: isTeacher ? '#0f2a4a' : AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: new Date().toISOString(),
  };
  await setDoc(profileRef, profile);
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw friendlyError(error);
  }
}

export async function register({ name, email, password }) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await createProfile(user, name);
  } catch (error) {
    throw error.code ? friendlyError(error) : error;
  }
}

/* ---------- Ambos modos ---------- */

export async function logout() {
  if (isFirebaseConfigured) await signOut(auth);
  else sessionStorage.removeItem(SESSION_KEY);
}

export async function updateProfile(userId, changes) {
  updateState((state) => ({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, ...changes } : user)),
  }));
}
