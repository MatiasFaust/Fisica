# Física · Nicolas Laviano

Plataforma para un profesor de Física y sus alumnos: repositorio de material, temas, ejercicios con entregas y una **pizarra colaborativa en tiempo real**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrí <http://localhost:5173>. Para generar la versión final: `npm run build` (queda en `dist/`).

### Probar la pizarra en tiempo real

1. Ingresá como **Profesor** y entrá a *Pizarra en vivo › Clase - Vectores*.
2. Abrí **otra pestaña** del mismo navegador, ingresá como **Alumno** (por ejemplo Matías) y entrá a la misma clase.
3. Lo que se dibuja en una pestaña aparece en la otra al instante, con el cursor y el nombre de cada uno.

Cada pestaña guarda su propio usuario, así que se pueden abrir varias con distintos alumnos.

## Qué incluye

| Sección | Profesor | Alumno |
| --- | --- | --- |
| Inicio | Resumen, últimos archivos, temas recientes, entregas, actividad | Lo mismo con sus tareas pendientes |
| Repositorio | Crear, renombrar y eliminar carpetas; subir, mover, renombrar y eliminar archivos; crear temas | Ver, abrir y descargar |
| Temas | Crear y editar explicación y fórmulas | Ver explicación, PDFs, ejercicios y material |
| Ejercicios | Crear (con imagen y PDF opcionales), ver entregas | Resolver y marcar como completado |
| Pizarra en vivo | Crear clases, permisos, expulsar, hojas, guardar, terminar | Dibujar (si tiene permiso) |
| Clases guardadas | Renombrar y eliminar | Repasar y descargar como imagen |
| Mis archivos | Todo lo que subió | Espacio privado + sus entregas |
| Alumnos | Progreso de cada alumno | — |

**Pizarra:** lápiz, marcador, borrador, línea, flecha, rectángulo, círculo, texto, color, grosor, deshacer/rehacer, borrar hoja, zoom y desplazamiento. Inserta imágenes, PDFs del repositorio y ejercicios. En tablet: con lápiz digital la mano no dibuja (solo mueve), y dos dedos hacen zoom.

Atajos: `P` lápiz · `M` marcador · `E` borrador · `L` línea · `A` flecha · `R` rectángulo · `O` círculo · `T` texto · `H` mover · `Ctrl+Z` / `Ctrl+Y` · `Espacio` + arrastrar para moverse · `Ctrl` + rueda para zoom.

## Estructura

```
src/
├── assets/            Logo
├── components/
│   ├── layout/        AppLayout, Sidebar, Navbar
│   ├── ui/            Modal, ConfirmDialog, PromptDialog, ActionMenu, FilterChips, EmptyState, PageHeader
│   ├── modals/        Subir archivos, mover, crear ejercicio, crear tema, clase
│   ├── whiteboard/    Whiteboard (canvas), WhiteboardToolbar, renderer, InsertModal, ParticipantsPanel
│   └── *.jsx          FolderCard, FileCard, TopicCard, ExerciseCard, UserAvatar, LiveUsers…
├── context/           Sesión (AuthContext) y avisos (ToastContext)
├── hooks/             useStore, useBoardSession, useOpenInWhiteboard, useFileActions
├── pages/             Una página por pantalla
├── services/          Toda la lógica de datos (ver abajo)
├── styles/            global, layout, components, pages, whiteboard
└── utils/             Formatos de fecha, imágenes, ids
```

## Dos modos de funcionamiento

| | Modo demostración (sin `.env`) | Modo Firebase (con `.env`) |
| --- | --- | --- |
| Ingreso | Se elige un usuario de prueba | Cuentas reales con email y contraseña |
| Datos | Navegador (localStorage + IndexedDB) | Firestore + Storage |
| Pizarra en vivo | Entre pestañas del mismo navegador | Entre cualquier dispositivo (Realtime Database) |

Las páginas nunca tocan el almacenamiento directamente: usan las funciones de `src/services/`, que deciden según el modo.

## Acceso de alumnos (modo Firebase)

La plataforma está publicada en **<https://fisica-aula.web.app>**, pero solo entran el profesor y los alumnos que él aprueba:

1. El alumno entra al link y toca **Crear cuenta**. Queda en una pantalla de espera.
2. Al profesor le aparece el aviso en *Inicio* y un contador en *Alumnos*; ahí toca **Aprobar** o **Rechazar**.
3. La pantalla del alumno se actualiza sola y ya puede usar todo.
4. Desde *Alumnos* el profesor puede **quitar el acceso** en cualquier momento (y devolverlo).

### Quién entra a cada clase en vivo

Al crear una clase el profesor elige:

- **Para quiénes es:** todos los alumnos o algunos. Los demás no la ven ni pueden entrar, aunque tengan el link.
- **Sala de espera:** los alumnos quedan esperando hasta que el profesor los deja pasar (de a uno o a todos). Se puede prender o apagar durante la clase desde *Participantes*.
- **Entran solo a mirar:** nadie escribe hasta que el profesor le da permiso.

Durante la clase el profesor puede expulsar a un alumno (no puede volver a entrar hasta que lo readmita).

### Videollamada

Cada clase puede tener videollamada (botón verde *Videollamada* en la pizarra):

- **De la plataforma** (por defecto): video propio, **dentro de la pizarra**, hecho con WebRTC y sin servicios externos. Funciona como un aula: el profesor transmite cámara y micrófono; los alumnos miran y **levantan la mano ✋** para hablar; cuando el profesor les da la palabra, todos los escuchan (y los ven, si prenden la cámara). El recuadro se puede minimizar sin cortar el audio.
- **Mi link:** el profesor pega un link de Google Meet, Zoom o Teams, que se abre en otra ventana.

Solo la ven los alumnos que ya entraron a la clase (después de la sala de espera). El profesor la agrega o la cambia desde el ícono ⚙ junto al botón, o desde el menú ⋮ de la clase en *Pizarra en vivo*.

**Límites de la videollamada propia:** el audio y el video van directo de navegador a navegador (Firebase solo conecta a los participantes), así que el profesor envía una copia a cada alumno. Con una conexión común funciona bien hasta unos **10–15 alumnos**. En redes muy cerradas (algunas escuelas o empresas) puede hacer falta un servidor TURN: se configura en `.env` con `VITE_TURN_URLS`, `VITE_TURN_USERNAME` y `VITE_TURN_CREDENTIAL` (por ejemplo, con la capa gratuita de Metered).

**Duración:** la videollamada propia no tiene límite de tiempo. Lo que sí tiene límite es la capa gratuita de Realtime Database (10 GB de descarga por mes; si se supera, se pausa hasta el mes siguiente). El video no pasa por Firebase; lo que más consume es la pizarra en vivo, por eso solo comparten el cursor quienes pueden escribir y los envíos están limitados. El consumo se ve en la consola de Firebase › Realtime Database › *Uso*.

### Reglas de seguridad

`firestore.rules`, `storage.rules` y `database.rules.json`. Este último se genera con `node scripts/database-rules.mjs` (toma el email del profesor de `.env`) y se publica con `npx firebase-tools deploy --only database`.

Esto lo garantizan las reglas de seguridad (`firestore.rules`, `database.rules.json`, `storage.rules`): una cuenta no aprobada no puede leer ni escribir nada, aunque intente acceder a la base directamente.

Para **cambiar el email del profesor**: actualizarlo en `.env` (`VITE_TEACHER_EMAIL`), en `firestore.rules` y en `database.rules.json`, y volver a publicar (`firebase deploy`).

## Configurar Firebase

1. Entrá a <https://console.firebase.google.com> y creá un proyecto (por ejemplo `fisica-aula`).
2. **Authentication** › Comenzar › habilitá **Correo electrónico/contraseña**.
3. **Firestore Database** › Crear base de datos (modo producción, región `southamerica-east1` o la más cercana).
4. **Realtime Database** › Crear base de datos (modo bloqueado). Copiá la URL que aparece arriba de los datos.
5. **Storage** › Comenzar. *Nota: Firebase pide activar el plan Blaze (requiere tarjeta, pero el uso de un curso entra en la capa gratuita). Sin Storage todo funciona menos la subida de archivos nuevos.*
6. Configuración del proyecto › Tus apps › agregá una app **Web** (`</>`) y copiá los valores de `firebaseConfig`.
7. Copiá `.env.example` como `.env` y completalo. En `VITE_TEACHER_EMAIL` poné el email con el que se va a registrar el profesor.
8. En `firestore.rules` y `database.rules.json` poné ese mismo email y publicá las reglas:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # elegí tu proyecto
   firebase deploy --only firestore:rules,database,storage
   ```
   (También se pueden pegar a mano en la pestaña *Reglas* de cada servicio.)
9. `npm run dev`. El profesor crea su cuenta con el email configurado; la primera vez se carga el contenido de ejemplo (carpetas, temas, ejercicios). Los alumnos se registran con *Crear cuenta* y el profesor los aprueba.

**Opcional:** para descargar archivos e insertarlos en la pizarra como imagen exportable, configurá CORS del bucket: `gsutil cors set cors.json gs://TU-BUCKET`.

**Publicar la página:** `npm run build` y `firebase deploy --only hosting` (queda en `https://TU-PROYECTO.web.app`).
