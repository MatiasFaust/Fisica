import { useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import Modal from '../ui/Modal';
import FileTypeIcon from '../FileTypeIcon';
import { formatSize, getFileType, CATEGORY_LABELS } from '../../utils/format';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.odt,.txt,.ppt,.pptx,.xls,.xlsx';

export default function UploadModal({ open, folderName, onClose, onUpload, showCategory = true }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('teoria');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (list) => setFiles((current) => [...current, ...Array.from(list)]);

  const close = () => {
    setFiles([]);
    onClose();
  };

  const handleUpload = async () => {
    setBusy(true);
    try {
      await onUpload(files, category);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Subir archivos"
      subtitle={folderName ? `Se guardarán en «${folderName}»` : undefined}
      onClose={close}
      footer={
        <>
          <button className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={handleUpload} disabled={!files.length || busy}>
            {busy ? 'Subiendo…' : `Subir ${files.length || ''} ${files.length === 1 ? 'archivo' : 'archivos'}`}
          </button>
        </>
      }
    >
      <div
        className={`dropzone ${dragging ? 'is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={32} />
        <strong>Arrastrá archivos acá o tocá para elegirlos</strong>
        <span>PDF, imágenes y documentos</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="upload-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <FileTypeIcon type={getFileType(file.name)} size={16} />
              <span className="upload-list__name">{file.name}</span>
              <span className="muted">{formatSize(file.size)}</span>
              <button className="icon-btn icon-btn--sm" onClick={() => setFiles(files.filter((_, i) => i !== index))} aria-label="Quitar">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCategory && (
        <label className="field">
          <span className="field__label">Tipo de material</span>
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
    </Modal>
  );
}
