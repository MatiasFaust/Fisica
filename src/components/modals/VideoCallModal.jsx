import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import VideoOptionField, { isVideoOptionValid } from './VideoOptionField';
import { videoOptionFrom } from '../../services/videoService';

/** Agregar, cambiar o quitar la videollamada de una clase que ya existe. */
export default function VideoCallModal({ open, session, onClose, onSave }) {
  const [option, setOption] = useState(() => videoOptionFrom(session?.video));

  useEffect(() => {
    if (open) setOption(videoOptionFrom(session?.video));
  }, [open, session?.video]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave(option);
    onClose();
  };

  return (
    <Modal open={open} title="Videollamada de la clase" subtitle={session?.title} onClose={onClose} size="sm">
      <form className="form" onSubmit={handleSubmit}>
        <VideoOptionField value={option} onChange={setOption} />
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!isVideoOptionValid(option)}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
