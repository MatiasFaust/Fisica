/**
 * Conexión con Firebase.
 *
 * Si el archivo .env tiene las claves del proyecto (ver .env.example), la app usa:
 *   - Authentication (email y contraseña)  → cuentas de profesor y alumnos
 *   - Firestore                            → carpetas, archivos, temas, ejercicios, clases
 *   - Storage                              → contenido de los archivos subidos
 *   - Realtime Database                    → pizarra en vivo (trazos, cursores, presencia)
 * Si no, funciona en "modo demostración" con datos guardados en el navegador.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

/** Email de la cuenta que tendrá permisos de profesor. */
export const TEACHER_EMAIL = (env.VITE_TEACHER_EMAIL ?? '').trim().toLowerCase();

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL);

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
// Los emails de Firebase (por ejemplo, para cambiar la contraseña) llegan en español.
if (auth) auth.languageCode = 'es';
// ignoreUndefinedProperties: los objetos de la app a veces tienen campos opcionales sin valor.
export const db = app ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : null;
export const rtdb = app ? getDatabase(app) : null;
export const storage = app ? getStorage(app) : null;
