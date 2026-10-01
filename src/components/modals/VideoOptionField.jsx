import { Video } from 'lucide-react';
import { isValidLink } from '../../services/videoService';

const MODES = [
  { value: 'propia', label: 'De la plataforma' },
  { value: 'link', label: 'Mi link' },
  { value: 'none', label: 'Sin video' },
];

const HELP = {
  propia: 'Video dentro de la pizarra: vos transmitís y los alumnos levantan la mano para hablar. Funciona mejor con hasta 15 alumnos.',
  link: 'Pegá el link de tu reunión de Google Meet, Zoom o Teams (se abre en otra ventana).',
  none: 'La clase no va a tener videollamada. La podés agregar después.',
};

/** Selector de videollamada para una clase: de la plataforma, link propio o ninguna. */
export default function VideoOptionField({ value, onChange }) {
  const linkInvalid = value.mode === 'link' && value.link.trim() !== '' && !isValidLink(value.link);

  return (
    <div className="field">
      <span className="field__label">
        <Video size={15} /> Videollamada
      </span>
      <div className="segmented segmented--3">
        {MODES.map((mode) => (
          <button type="button" key={mode.value} className={value.mode === mode.value ? 'is-active' : ''} onClick={() => onChange({ ...value, mode: mode.value })}>
            {mode.label}
          </button>
        ))}
      </div>
      {value.mode === 'link' && (
        <input
          className="input video-link"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={value.link}
          onChange={(event) => onChange({ ...value, link: event.target.value })}
          placeholder="https://meet.google.com/abc-defg-hij"
          aria-invalid={linkInvalid}
        />
      )}
      <span className={`field__help ${linkInvalid ? 'field__help--error' : ''}`}>{linkInvalid ? 'El link no parece válido.' : HELP[value.mode]}</span>
    </div>
  );
}

/** ¿Se puede guardar la opción elegida? */
export const isVideoOptionValid = (value) => value.mode !== 'link' || isValidLink(value.link);
