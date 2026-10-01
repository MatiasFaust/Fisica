import { useState } from 'react';
import { Save, RotateCcw, Database, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import UserAvatar from '../components/UserAvatar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { updateProfile } from '../services/authService';
import { resetDatabase } from '../services/store';
import { isFirebaseConfigured } from '../services/firebase';

const AVATAR_COLORS = ['#0f2a4a', '#2563eb', '#0891b2', '#7c3aed', '#db2777', '#16a34a', '#ea580c'];

export default function SettingsPage() {
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.displayName);
  const [color, setColor] = useState(user.color);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    await updateProfile(user.id, { displayName: name.trim(), name: isTeacher ? user.name : name.trim(), color });
    toast.success('Perfil actualizado');
  };

  return (
    <div className="page page--narrow">
      <PageHeader eyebrow="Cuenta" title="Configuración" />

      <section className="card">
        <h2 className="card__title">Perfil</h2>
        <form className="form" onSubmit={handleSave}>
          <div className="profile-preview">
            <UserAvatar user={{ ...user, displayName: name, color }} size={64} />
            <div>
              <strong>{name}</strong>
              <span className="muted">
                {user.email} · {isTeacher ? 'Profesor' : 'Alumno'} de Física
              </span>
            </div>
          </div>
          <label className="field">
            <span className="field__label">Nombre visible</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="field">
            <span className="field__label">Color del avatar y del cursor en la pizarra</span>
            <div className="color-options">
              {AVATAR_COLORS.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={`color-option ${color === value ? 'is-active' : ''}`}
                  style={{ background: value }}
                  onClick={() => setColor(value)}
                  aria-label={`Color ${value}`}
                />
              ))}
            </div>
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
              <Save size={17} /> Guardar cambios
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="card__title">Datos</h2>
        <div className="setting-row">
          <span className="setting-row__icon">{isFirebaseConfigured ? <Cloud size={20} /> : <Database size={20} />}</span>
          <div>
            <strong>{isFirebaseConfigured ? 'Conectado a Firebase' : 'Modo demostración'}</strong>
            <p className="muted">
              {isFirebaseConfigured
                ? 'Los datos se guardan en la nube.'
                : 'Los datos se guardan en este navegador. Cuando se configure Firebase, se compartirán entre todos los dispositivos.'}
            </p>
          </div>
        </div>
        {isTeacher && !isFirebaseConfigured && (
          <div className="setting-row">
            <span className="setting-row__icon">
              <RotateCcw size={20} />
            </span>
            <div>
              <strong>Restablecer datos de prueba</strong>
              <p className="muted">Vuelve a cargar las carpetas, archivos, ejercicios y clases de ejemplo.</p>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(true)}>
              Restablecer
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Restablecer datos de prueba"
        message="Se perderán los cambios hechos en este navegador (carpetas, archivos subidos, ejercicios y clases)."
        confirmLabel="Restablecer"
        danger
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDatabase();
          toast.success('Datos de prueba restablecidos');
        }}
      />
    </div>
  );
}
