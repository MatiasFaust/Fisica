/**
 * Genera database.rules.json (reglas de Realtime Database).
 *
 * Uso:  node scripts/database-rules.mjs [email-del-profesor ...]
 * Sin argumentos usa VITE_TEACHER_EMAIL del archivo .env.
 * Después: npx firebase-tools deploy --only database
 */
import { readFileSync, writeFileSync } from 'node:fs';

function teacherEmails() {
  const fromArgs = process.argv.slice(2);
  if (fromArgs.length) return fromArgs;
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const email = env.match(/^VITE_TEACHER_EMAIL=(.+)$/m)?.[1]?.trim();
  if (!email) throw new Error('Falta VITE_TEACHER_EMAIL en .env');
  return [email];
}

const emails = teacherEmails().map((email) => email.toLowerCase());
const TEACHER = emails.length === 1 ? `auth.token.email == '${emails[0]}'` : `(${emails.map((e) => `auth.token.email == '${e}'`).join(' || ')})`;
const IS_TEACHER = `auth != null && ${TEACHER}`;
const SELF = 'auth != null && auth.uid == $uid';
const MEMBER = "root.child('members').child(auth.uid).val() == true";
const BOARD = "root.child('boards').child($sessionId)";
const NOT_BANNED = `${BOARD}.child('banned').child(auth.uid).val() != true`;
const INVITED = `(${BOARD}.child('config').child('all').val() == true || ${BOARD}.child('allowed').child(auth.uid).val() == true)`;
const ADMITTED = `(${BOARD}.child('config').child('waiting').val() != true || ${BOARD}.child('admitted').child(auth.uid).val() == true)`;
const NO_CONFIG = `!${BOARD}.child('config').exists()`;
// Puede estar en la clase: alumno aprobado, no expulsado, invitado y (si hay sala de espera) admitido.
const CAN_ENTER = `auth != null && ${MEMBER} && ${NOT_BANNED} && (${NO_CONFIG} || (${INVITED} && ${ADMITTED}))`;
const CAN_REQUEST = `${SELF} && ${MEMBER} && ${NOT_BANNED} && (${NO_CONFIG} || ${INVITED})`;
const OWN_ENTRY = { '.read': CAN_ENTER, $uid: { '.write': `${SELF} && ${CAN_ENTER}` } };

const rules = {
  rules: {
    // Alumnos aprobados por el profesor (copia de Firestore, que estas reglas no pueden leer).
    members: {
      '.read': IS_TEACHER,
      $uid: { '.read': SELF, '.write': IS_TEACHER, '.validate': 'newData.isBoolean()' },
    },
    boards: {
      $sessionId: {
        // El profesor tiene control total de cada clase.
        '.read': IS_TEACHER,
        '.write': IS_TEACHER,
        config: { '.read': `auth != null && ${MEMBER}` },
        allowed: { $uid: { '.read': SELF } },
        admitted: { $uid: { '.read': SELF } },
        banned: { $uid: { '.read': SELF } },
        lobby: { $uid: { '.read': SELF, '.write': CAN_REQUEST } },
        ops: { '.read': CAN_ENTER, $opId: { '.write': `${CAN_ENTER} && !data.exists()` } },
        presence: OWN_ENTRY,
        cursors: OWN_ENTRY,
        drafts: OWN_ENTRY,
        // Videollamada: estado y mensajes de conexión entre navegadores.
        call: {
          live: { '.read': CAN_ENTER },
          members: OWN_ENTRY,
          hands: OWN_ENTRY,
          // Solo el profesor da la palabra; el alumno puede devolverla.
          speakers: { '.read': CAN_ENTER, $uid: { '.write': `${SELF} && !newData.exists()` } },
          signals: {
            $to: {
              '.read': 'auth != null && auth.uid == $to',
              '.write': 'auth != null && auth.uid == $to && !newData.exists()',
              $msg: {
                '.write': `(${CAN_ENTER} && !data.exists() && newData.child('from').val() == auth.uid) || (auth != null && auth.uid == $to && !newData.exists())`,
              },
            },
          },
        },
      },
    },
  },
};

writeFileSync(new URL('../database.rules.json', import.meta.url), `${JSON.stringify(rules, null, 2)}\n`);
console.log(`database.rules.json generado para: ${emails.join(', ')}`);
