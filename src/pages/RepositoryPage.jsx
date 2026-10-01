import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FolderPlus,
  Upload,
  BookPlus,
  Pencil,
  Trash2,
  FolderInput,
  PenLine,
  Presentation,
  FolderOpen,
  SearchX,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import { useFileActions } from '../hooks/useFileActions';
import { useOpenInWhiteboard } from '../hooks/useOpenInWhiteboard';
import Breadcrumbs from '../components/Breadcrumbs';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import TopicCard from '../components/TopicCard';
import EmptyState from '../components/ui/EmptyState';
import FilterChips from '../components/ui/FilterChips';
import ActionMenu from '../components/ui/ActionMenu';
import PromptDialog from '../components/ui/PromptDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import UploadModal from '../components/modals/UploadModal';
import MoveFileModal from '../components/modals/MoveFileModal';
import TopicFormModal from '../components/modals/TopicFormModal';
import * as repo from '../services/repositoryService';
import { renameSavedClass, deleteSavedClass } from '../services/classService';
import { formatDate, normalize } from '../utils/format';

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Imágenes' },
  { value: 'doc', label: 'Documentos' },
];

export default function RepositoryPage() {
  const { folderId = repo.ROOT_FOLDER_ID } = useParams();
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileActions = useFileActions();
  const openInWhiteboard = useOpenInWhiteboard();

  const [typeFilter, setTypeFilter] = useState('all');
  const [dialog, setDialog] = useState(null); // { kind, item }
  const closeDialog = () => setDialog(null);

  const isSavedClasses = folderId === repo.SAVED_CLASSES_FOLDER_ID;
  const folder = state.folders.find((item) => item.id === folderId);
  const publicFiles = useMemo(() => state.files.filter((file) => file.visibility !== 'private'), [state.files]);

  const countItems = (id) => state.folders.filter((f) => f.parentId === id).length + publicFiles.filter((f) => f.folderId === id).length;
  const topicName = (file) => repo.getTopicForFolder(state, file.folderId)?.name;
  const folderLabel = (file) => state.folders.find((f) => f.id === file.folderId)?.name;

  const run = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(error.message);
    }
  };

  /* ---------- Menús de acciones del profesor ---------- */

  const folderMenu = (item) =>
    isTeacher
      ? [
          { label: 'Renombrar', icon: Pencil, onClick: () => setDialog({ kind: 'renameFolder', item }) },
          { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setDialog({ kind: 'deleteFolder', item }) },
        ]
      : null;

  const fileMenu = (file) => {
    const items = [{ label: 'Abrir en pizarra', icon: PenLine, onClick: () => openInWhiteboard({ kind: 'file', id: file.id }, repo.getTopicForFolder(state, file.folderId)?.id) }];
    if (isTeacher) {
      items.push(
        { label: 'Renombrar', icon: Pencil, onClick: () => setDialog({ kind: 'renameFile', item: file }) },
        { label: 'Mover a…', icon: FolderInput, onClick: () => setDialog({ kind: 'moveFile', item: file }) },
        { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setDialog({ kind: 'deleteFile', item: file }) },
      );
    }
    return items;
  };

  const renderFiles = (files, showLocation = false) => (
    <div className="file-list">
      <div className="file-list__head">
        <span>Nombre</span>
        <span>Tema</span>
        <span>Tipo</span>
        <span>Subido</span>
        <span />
      </div>
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          topicName={topicName(file)}
          location={showLocation ? folderLabel(file) : undefined}
          onOpen={() => fileActions.open(file)}
          onDownload={() => fileActions.download(file)}
          menuItems={fileMenu(file)}
        />
      ))}
    </div>
  );

  /* ---------- Contenido según la vista ---------- */

  let content;

  if (query) {
    const q = normalize(query);
    const topics = state.topics.filter((t) => normalize(`${t.name} ${t.summary}`).includes(q));
    const folders = state.folders.filter((f) => f.id !== repo.ROOT_FOLDER_ID && normalize(f.name).includes(q));
    const files = publicFiles.filter((f) => normalize(`${f.name} ${topicName(f) ?? ''}`).includes(q));
    const classes = state.savedClasses.filter((c) => normalize(c.title).includes(q));
    const total = topics.length + folders.length + files.length + classes.length;

    content = (
      <>
        <div className="search-summary">
          <p>
            {total} resultado{total === 1 ? '' : 's'} para <strong>«{query}»</strong>
          </p>
          <Link to="/repositorio" className="btn btn--ghost btn--sm">
            <X size={15} /> Limpiar búsqueda
          </Link>
        </div>
        {!total && <EmptyState icon={SearchX} title="Sin resultados" text="Probá con otro nombre de tema o de archivo." />}
        {topics.length > 0 && (
          <section className="section">
            <h2 className="section__title">Temas</h2>
            <div className="grid grid--cards">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  fileCount={repo.getFilesForTopic(state, topic).length}
                  exerciseCount={state.exercises.filter((e) => e.topicId === topic.id).length}
                  onClick={() => navigate(`/temas/${topic.id}`)}
                />
              ))}
            </div>
          </section>
        )}
        {folders.length > 0 && (
          <section className="section">
            <h2 className="section__title">Carpetas</h2>
            <div className="grid grid--folders">
              {folders.map((item) => (
                <FolderCard key={item.id} folder={item} itemCount={countItems(item.id)} onOpen={() => navigate(`/repositorio/${item.id}`)} />
              ))}
            </div>
          </section>
        )}
        {files.length > 0 && (
          <section className="section">
            <h2 className="section__title">Archivos</h2>
            {renderFiles(files, true)}
          </section>
        )}
        {classes.length > 0 && (
          <section className="section">
            <h2 className="section__title">Clases guardadas</h2>
            <SavedClassList classes={classes} state={state} isTeacher={isTeacher} onDialog={setDialog} />
          </section>
        )}
      </>
    );
  } else if (isSavedClasses) {
    content = state.savedClasses.length ? (
      <SavedClassList classes={state.savedClasses} state={state} isTeacher={isTeacher} onDialog={setDialog} />
    ) : (
      <EmptyState icon={Presentation} title="Todavía no hay clases guardadas" text="Al terminar una clase en vivo, el profesor puede guardarla y aparece acá." />
    );
  } else if (!folder) {
    content = <EmptyState icon={FolderOpen} title="Carpeta no encontrada" action={<Link to="/repositorio" className="btn btn--primary">Volver al repositorio</Link>} />;
  } else {
    const subfolders = state.folders.filter((f) => f.parentId === folder.id).sort((a, b) => a.name.localeCompare(b.name));
    const files = publicFiles
      .filter((f) => f.folderId === folder.id && (typeFilter === 'all' || f.type === typeFilter))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    const allFilesHere = publicFiles.filter((f) => f.folderId === folder.id);
    const isRoot = folder.id === repo.ROOT_FOLDER_ID;

    content = (
      <>
        {(subfolders.length > 0 || isRoot) && (
          <section className="section">
            <h2 className="section__title">Carpetas</h2>
            <div className="grid grid--folders">
              {subfolders.map((item) => {
                const topic = state.topics.find((t) => t.folderId === item.id);
                return (
                  <FolderCard
                    key={item.id}
                    folder={item}
                    accent={topic?.color}
                    itemCount={countItems(item.id)}
                    onOpen={() => navigate(`/repositorio/${item.id}`)}
                    menuItems={folderMenu(item)}
                  />
                );
              })}
              {isRoot && (
                <FolderCard
                  folder={{ name: 'Clases guardadas' }}
                  icon={Presentation}
                  accent="#0f2a4a"
                  itemCount={state.savedClasses.length}
                  onOpen={() => navigate(`/repositorio/${repo.SAVED_CLASSES_FOLDER_ID}`)}
                />
              )}
            </div>
          </section>
        )}

        {/* En la carpeta principal la sección de archivos solo aparece si hay alguno. */}
        {(!isRoot || allFilesHere.length > 0) && (
        <section className="section">
          <div className="section__bar">
            <h2 className="section__title">Archivos</h2>
            {allFilesHere.length > 0 && <FilterChips options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />}
          </div>
          {files.length ? (
            renderFiles(files)
          ) : (
            <EmptyState
              icon={Layers}
              title={allFilesHere.length ? 'No hay archivos de este tipo' : 'Esta carpeta no tiene archivos'}
              text={isTeacher ? 'Subí PDFs, imágenes o documentos para tus alumnos.' : 'Cuando el profesor suba material, lo vas a ver acá.'}
              action={
                isTeacher && (
                  <button className="btn btn--primary" onClick={() => setDialog({ kind: 'upload' })}>
                    <Upload size={17} /> Subir archivos
                  </button>
                )
              }
            />
          )}
        </section>
        )}
      </>
    );
  }

  /* ---------- Encabezado ---------- */

  const path = folder ? repo.getFolderPath(state.folders, folder.id) : [];
  const crumbs = isSavedClasses
    ? [{ label: 'Física', to: '/repositorio' }, { label: 'Clases guardadas' }]
    : path.map((item) => ({ label: item.name, to: item.id === repo.ROOT_FOLDER_ID ? '/repositorio' : `/repositorio/${item.id}` }));
  const title = query ? 'Búsqueda' : isSavedClasses ? 'Clases guardadas' : folder?.id === repo.ROOT_FOLDER_ID ? 'Repositorio de Física' : folder?.name;
  const canManageHere = isTeacher && !query && !isSavedClasses && folder;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          {!query && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
          <h1 className="page-header__title">{title}</h1>
          {folder?.id === repo.ROOT_FOLDER_ID && !query && <p className="page-header__subtitle">Todo el material de la materia, ordenado por tema.</p>}
        </div>
        {canManageHere && (
          <div className="page-header__actions">
            {folder.id === repo.ROOT_FOLDER_ID && (
              <button className="btn btn--ghost" onClick={() => setDialog({ kind: 'newTopic' })}>
                <BookPlus size={18} /> <span className="hide-sm">Nuevo tema</span>
              </button>
            )}
            <button className="btn btn--soft" onClick={() => setDialog({ kind: 'newFolder' })}>
              <FolderPlus size={18} /> <span className="hide-sm">Nueva carpeta</span>
            </button>
            <button className="btn btn--primary" onClick={() => setDialog({ kind: 'upload' })}>
              <Upload size={18} /> Subir
            </button>
          </div>
        )}
      </div>

      {content}

      {/* ---------- Diálogos ---------- */}
      <PromptDialog
        open={dialog?.kind === 'newFolder'}
        title="Nueva carpeta"
        label="Nombre de la carpeta"
        placeholder="Ej.: Tiro oblicuo"
        confirmLabel="Crear carpeta"
        onClose={closeDialog}
        onSubmit={(name) => run(() => repo.createFolder({ name, parentId: folder.id }, user), `Carpeta «${name}» creada`)}
      />
      <PromptDialog
        open={dialog?.kind === 'renameFolder'}
        title="Renombrar carpeta"
        label="Nuevo nombre"
        initialValue={dialog?.item?.name}
        onClose={closeDialog}
        onSubmit={(name) => run(() => repo.renameFolder(dialog.item.id, name), 'Carpeta renombrada')}
      />
      <PromptDialog
        open={dialog?.kind === 'renameFile'}
        title="Renombrar archivo"
        label="Nuevo nombre"
        initialValue={dialog?.item?.name}
        onClose={closeDialog}
        onSubmit={(name) => run(() => repo.renameFile(dialog.item.id, name), 'Archivo renombrado')}
      />
      <PromptDialog
        open={dialog?.kind === 'renameClass'}
        title="Renombrar clase"
        label="Nombre de la clase"
        initialValue={dialog?.item?.title}
        onClose={closeDialog}
        onSubmit={(name) => run(() => renameSavedClass(dialog.item.id, name), 'Clase renombrada')}
      />
      <ConfirmDialog
        open={dialog?.kind === 'deleteFolder'}
        title="Eliminar carpeta"
        message={`Se eliminará «${dialog?.item?.name}» con todas sus subcarpetas y archivos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onClose={closeDialog}
        onConfirm={() => run(() => repo.deleteFolder(dialog.item.id), 'Carpeta eliminada')}
      />
      <ConfirmDialog
        open={dialog?.kind === 'deleteFile'}
        title="Eliminar archivo"
        message={`¿Eliminar «${dialog?.item?.name}»? Los alumnos dejarán de verlo.`}
        confirmLabel="Eliminar"
        danger
        onClose={closeDialog}
        onConfirm={() => run(() => repo.deleteFile(dialog.item.id), 'Archivo eliminado')}
      />
      <ConfirmDialog
        open={dialog?.kind === 'deleteClass'}
        title="Eliminar clase guardada"
        message={`¿Eliminar «${dialog?.item?.title}»? Los alumnos ya no podrán repasarla.`}
        confirmLabel="Eliminar"
        danger
        onClose={closeDialog}
        onConfirm={() => run(() => deleteSavedClass(dialog.item.id), 'Clase eliminada')}
      />
      <UploadModal
        open={dialog?.kind === 'upload'}
        folderName={folder?.name}
        onClose={closeDialog}
        onUpload={(files, category) =>
          run(() => repo.uploadFiles(files, { folderId: folder.id, category }, user), files.length === 1 ? 'Archivo subido' : `${files.length} archivos subidos`)
        }
      />
      <MoveFileModal
        open={dialog?.kind === 'moveFile'}
        file={dialog?.item}
        folders={state.folders}
        onClose={closeDialog}
        onMove={(target) => run(() => repo.moveFile(dialog.item.id, target), 'Archivo movido')}
      />
      <TopicFormModal
        open={dialog?.kind === 'newTopic'}
        onClose={closeDialog}
        onSubmit={(form) => run(() => repo.createTopic(form, user), `Tema «${form.name}» creado`)}
      />
    </div>
  );
}

function SavedClassList({ classes, state, isTeacher, onDialog }) {
  return (
    <div className="saved-list">
      {classes.map((item) => {
        const topic = state.topics.find((t) => t.id === item.topicId);
        return (
          <div key={item.id} className="saved-class" style={{ '--topic-color': topic?.color ?? '#0f2a4a' }}>
            <Link to={`/clases/${item.id}`} className="saved-class__main">
              <span className="saved-class__icon">
                <Presentation size={20} />
              </span>
              <span className="saved-class__text">
                <strong>
                  {item.title} - {formatDate(item.savedAt)}
                </strong>
                <span>
                  {topic?.name ?? 'Sin tema'} · {item.pages.length} {item.pages.length === 1 ? 'hoja' : 'hojas'}
                </span>
              </span>
            </Link>
            <Link to={`/clases/${item.id}`} className="btn btn--soft btn--sm">
              Repasar
            </Link>
            {isTeacher && (
              <ActionMenu
                items={[
                  { label: 'Renombrar', icon: Pencil, onClick: () => onDialog({ kind: 'renameClass', item }) },
                  { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => onDialog({ kind: 'deleteClass', item }) },
                ]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
