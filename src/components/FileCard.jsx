import { Download, ExternalLink } from 'lucide-react';
import FileTypeIcon from './FileTypeIcon';
import ActionMenu from './ui/ActionMenu';
import { formatDate, FILE_TYPE_LABELS } from '../utils/format';

/** Fila de archivo: nombre, fecha, tema, tipo y acciones. */
export default function FileCard({ file, topicName, location, onOpen, onDownload, menuItems }) {
  return (
    <div className="file-card">
      <button className="file-card__main" onClick={onOpen} title={`Abrir ${file.name}`}>
        <FileTypeIcon type={file.type} />
        <span className="file-card__text">
          <span className="file-card__name">{file.name}</span>
          <span className="file-card__meta">
            {FILE_TYPE_LABELS[file.type]} · {formatDate(file.uploadedAt)}
            {location && <> · {location}</>}
          </span>
        </span>
      </button>
      <span className="file-card__topic">{topicName ? <span className="tag">{topicName}</span> : <span className="muted">—</span>}</span>
      <span className="file-card__type">{FILE_TYPE_LABELS[file.type]}</span>
      <span className="file-card__date">{formatDate(file.uploadedAt)}</span>
      <div className="file-card__actions">
        <button className="btn btn--soft btn--sm" onClick={onOpen}>
          <ExternalLink size={15} />
          <span className="hide-sm">Abrir</span>
        </button>
        <button className="icon-btn" onClick={onDownload} aria-label="Descargar" title="Descargar">
          <Download size={18} />
        </button>
        {menuItems?.length > 0 && <ActionMenu items={menuItems} />}
      </div>
    </div>
  );
}
