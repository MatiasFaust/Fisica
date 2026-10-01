import { useEffect, useState } from 'react';
import { Folder, Check } from 'lucide-react';
import Modal from '../ui/Modal';

/** Árbol de carpetas para elegir el destino de un archivo. */
export default function MoveFileModal({ open, file, folders, onClose, onMove }) {
  const [target, setTarget] = useState(file?.folderId);

  useEffect(() => {
    if (open) setTarget(file?.folderId);
  }, [open, file]);

  const renderTree = (parentId, depth) =>
    folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => (
        <div key={folder.id}>
          <button
            className={`tree-item ${target === folder.id ? 'is-selected' : ''}`}
            style={{ paddingLeft: 12 + depth * 20 }}
            onClick={() => setTarget(folder.id)}
          >
            <Folder size={16} />
            <span>{folder.name}</span>
            {folder.id === file?.folderId && <span className="muted tree-item__note">actual</span>}
            {target === folder.id && <Check size={16} className="tree-item__check" />}
          </button>
          {renderTree(folder.id, depth + 1)}
        </div>
      ));

  return (
    <Modal
      open={open}
      title="Mover archivo"
      subtitle={file?.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--primary"
            disabled={!target || target === file?.folderId}
            onClick={async () => {
              await onMove(target);
              onClose();
            }}
          >
            Mover acá
          </button>
        </>
      }
    >
      <div className="tree">{renderTree(null, 0)}</div>
    </Modal>
  );
}
