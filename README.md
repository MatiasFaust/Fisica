# Física · Aula digital

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

## Configurar Firebase

1. Entrá a <https://console.firebase.google.com> y creá un proyecto (por ejemplo `fisica-aula`).
2. **Authentication** › Comenzar › habilitá **Correo electrónico/contraseña**.
3. **Firestore Database** › Crear base de datos (modo producción, región `southamerica-east1` o la más cercana).
4. **Realtime Database** › Crear base de datos (modo bloqueado). Copiá la URL que aparece arriba de los datos.
5. **Storage** › Comenzar. *Nota: Firebase pide activar el plan Blaze (requiere tarjeta, pero el uso de un curso entra en la capa gratuita). Sin Storage todo funciona menos la subida de archivos nuevos.*
6. Configuración del proyecto › Tus apps › agregá una app **Web** (`</>`) y copiá los valores de `firebaseConfig`.
7. Copiá `.env.example` como `.env` y completalo. En `VITE_TEACHER_EMAIL` poné el email con el que se va a registrar el profesor.
8. En `firestore.rules` reemplazá `profesor@ejemplo.com` por ese mismo email y publicá las reglas:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # elegí tu proyecto
   firebase deploy --only firestore:rules,database,storage
   ```
   (También se pueden pegar a mano en la pestaña *Reglas* de cada servicio.)
9. `npm run dev`. El profesor crea su cuenta con el email configurado; la primera vez se carga el contenido de ejemplo (carpetas, temas, ejercicios). Los alumnos se registran con *Crear cuenta*.

**Opcional:** para descargar archivos e insertarlos en la pizarra como imagen exportable, configurá CORS del bucket: `gsutil cors set cors.json gs://TU-BUCKET`.

**Publicar la página:** `npm run build` y `firebase deploy --only hosting` (queda en `https://TU-PROYECTO.web.app`).
