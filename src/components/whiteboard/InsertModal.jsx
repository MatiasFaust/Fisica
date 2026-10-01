import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Search, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import FileTypeIcon from '../FileTypeIcon';
import FilterChips from '../ui/FilterChips';
import { useStore } from '../../hooks/useStore';
import { getTopicForFolder } from '../../services/repositoryService';
import { DIFFICULTIES } from '../../services/exerciseService';
import { normalize } from '../../utils/format';

const TABS = [
  { value: 'exercise', label: 'Ejercicios' },
  { value: 'file', label: 'Archivos del repositorio' },
  { value: 'image', label: 'Imagen del dispositivo' },
];

/** Elegir qué insertar en la pizarra: ejercicio, archivo del repositorio o imagen propia. */
export default function InsertModal({ open, initialTab = 'exercise', onClose, onPick }) {
  const state = useStore();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const [lastOpen, setLastOpen] = useState(open);

  // Al abrir, arranca en la pestaña pedida desde la barra de herramientas.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTab(initialTab);
      setQuery('');
    }
  }

  const q = normalize(query);
  const exercises = useMemo(() => state.exercises.filter((ex) => normalize(ex.title).includes(q)), [state.exercises, q]);
  const files = useMemo(
    () => state.files.filter((file) => file.visibility !== 'private' && normalize(file.name).includes(q)),
    [state.files, q],
  );

  const pick = (item) => {
    onPick(item);
    onClose();
  };

  return (
    <Modal open={open} title="Insertar en la pizarra" subtitle="Aparece en el centro de la vista actual." onClose={onClose} size="lg">
      <FilterChips options={TABS} value={tab} onChange={setTab} />

      {tab !== 'image' && (
        <label className="search search--inline">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" />
        </label>
      )}

      {tab === 'exercise' && (
        <div className="pick-list">
          {exercises.map((exercise) => {
            const topic = state.topics.find((t) => t.id === exercise.topicId);
            return (
              <button key={exercise.id} className="pick-item" onClick={() => pick({ kind: 'exercise', id: exercise.id })}>
                <span className="pick-item__dot" style={{ background: topic?.color }} />
                <span className="pick-item__text">
                  <strong>{exercise.title}</strong>
                  <span>
                    {topic?.name} · {DIFFICULTIES[exercise.difficulty]?.label}
                  </span>
                </span>
              </button>
            );
          })}
          {!exercises.length && <p className="muted">No hay ejercicios que coincidan.</p>}
        </div>
      )}

      {tab === 'file' && (
        <div className="pick-list">
          {files.map((file) => (
            <button key={file.id} className="pick-item" onClick={() => pick({ kind: 'file', id: file.id })}>
              <FileTypeIcon type={file.type} size={18} />
              <span className="pick-item__text">
                <strong>{file.name}</strong>
                <span>{getTopicForFolder(state, file.folderId)?.name ?? 'Repositorio'}</span>
              </span>
            </button>
          ))}
          {!files.length && <p className="muted">No hay archivos que coincidan.</p>}
        </div>
      )}

      {tab === 'image' && (
        <button className="dropzone" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={30} />
          <strong>Elegir una imagen</strong>
          <span>Foto del cuaderno, captura o diagrama (JPG, PNG, SVG)</span>
          <span className="btn btn--primary btn--sm">
            <Upload size={15} /> Seleccionar archivo
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) pick({ kind: 'deviceImage', file });
            }}
          />
        </button>
      )}
    </Modal>
  );
}
