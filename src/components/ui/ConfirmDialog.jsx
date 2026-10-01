import { useState } from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={handleConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
