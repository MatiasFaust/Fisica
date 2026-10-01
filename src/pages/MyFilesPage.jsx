import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Trash2, Files, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import { useFileActions } from '../hooks/useFileActions';
import PageHeader from '../components/ui/PageHeader';
import FilterChips from '../components/ui/FilterChips';
import EmptyState from '../components/ui/EmptyState';
import FileCard from '../components/FileCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import UploadModal from '../components/modals/UploadModal';
import { deleteFile, getTopicForFolder, uploadFiles } from '../services/repositoryService';
import { formatRelative } from '../utils/format';

/**
 * Profesor: todo lo que subió al repositorio.
 * Alumno: su espacio privado (fotos de resoluciones, apuntes) y sus entregas.
 */
export default function MyFilesPage() {
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const fileActions = useFileActions();
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const myFiles = useMemo(
    () => state.files.filter((file) => file.ownerId === user.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [state.files, user.id],
  );
  const visible = myFiles.filter((file) => filter === 'all' || file.type === filter);
  const mySubmissions = state.submissions.filter((sub) => sub.studentId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const options = [
    { value: 'all', label: 'Todos', count: myFiles.length },
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Imágenes' },
    { value: 'doc', label: 'Documentos' },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow={isTeacher ? 'Profesor' : 'Alumno'}
        title="Mis archivos"
        subtitle={isTeacher ? 'Todo el material que subiste al repositorio.' : 'Tu espacio privado para apuntes y fotos de tus resoluciones. Solo vos lo ves.'}
        actions={
          <button className="btn btn--primary" onClick={() => setUploading(true)}>
            <Upload size={18} /> Subir
          </button>
        }
      />

      <FilterChips options={options} value={filter} onChange={setFilter} />

      {visible.length ? (
        <div className="file-list">
          <div className="file-list__head">
            <span>Nombre</span>
            <span>Tema</span>
            <span>Tipo</span>
            <span>Subido</span>
            <span />
          </div>
          {visible.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              topicName={file.visibility === 'private' ? undefined : getTopicForFolder(state, file.folderId)?.name}
              location={file.visibility === 'private' ? 'Privado' : undefined}
              onOpen={() => fileActions.open(file)}
              onDownload={() => fileActions.download(file)}
              menuItems={[{ label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setToDelete(file) }]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={isTeacher ? Files : Lock}
          title="No hay archivos acá"
          text={isTeacher ? 'Los archivos que subas al repositorio aparecen en esta lista.' : 'Subí fotos de tus ejercicios o apuntes para tenerlos a mano.'}
        />
      )}

      {!isTeacher && (
        <section className="section">
          <h2 className="section__title">
            <CheckCircle2 size={18} /> Mis entregas
          </h2>
          {mySubmissions.length ? (
            <ul className="mini-list mini-list--card">
              {mySubmissions.map((sub) => {
                const exercise = state.exercises.find((e) => e.id === sub.exerciseId);
                if (!exercise) return null;
                return (
                  <li key={sub.id}>
                    <Link to={`/ejercicios/${exercise.id}`}>
                      <CheckCircle2 size={16} className="text-success" />
                      <span>{exercise.title}</span>
                      <span className="muted">{formatRelative(sub.submittedAt)}</span>
                      <ArrowRight size={15} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Todavía no marcaste ejercicios como resueltos.</p>
          )}
        </section>
      )}

      <UploadModal
        open={uploading}
        folderName={isTeacher ? 'Física (carpeta principal)' : 'tu espacio privado'}
        showCategory={isTeacher}
        onClose={() => setUploading(false)}
        onUpload={async (files, category) => {
          try {
            await uploadFiles(files, isTeacher ? { folderId: 'root', category } : { folderId: `personal-${user.id}`, category: 'complementario', visibility: 'private' }, user);
            toast.success(files.length === 1 ? 'Archivo subido' : `${files.length} archivos subidos`);
          } catch (error) {
            toast.error(error.message);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar archivo"
        message={`¿Eliminar «${toDelete?.name}»?`}
        confirmLabel="Eliminar"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await deleteFile(toDelete.id);
          toast.success('Archivo eliminado');
        }}
      />
    </div>
  );
}
