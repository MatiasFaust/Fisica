import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Presentation, ArrowLeft, ArrowRight, FolderOpen, PenLine, ClipboardList, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../hooks/useStore';
import UserAvatar from '../components/UserAvatar';
import logo from '../assets/logo.svg';

const FEATURES = [
  { icon: FolderOpen, text: 'Todo el material ordenado por tema' },
  { icon: PenLine, text: 'Pizarra en vivo para resolver juntos' },
  { icon: ClipboardList, text: 'Ejercicios con seguimiento de entregas' },
];

export default function LoginPage() {
  const { cloud } = useAuth();

  return (
    <div className="login">
      <section className="login__hero">
        <div className="login__brand">
          <img src={logo} alt="" width="44" height="44" />
          <div>
            <strong>Física</strong>
            <span>Aula digital</span>
          </div>
        </div>

        <div className="login__hero-content">
          <h1>Las clases de Física, organizadas en un solo lugar.</h1>
          <p>Material, ejercicios y una pizarra compartida para seguir la clase desde cualquier dispositivo.</p>
          <ul className="login__features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span>
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <svg className="login__orbit" viewBox="0 0 400 400" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="200" cy="200" rx="180" ry="70" />
            <ellipse cx="200" cy="200" rx="180" ry="70" transform="rotate(60 200 200)" />
            <ellipse cx="200" cy="200" rx="180" ry="70" transform="rotate(120 200 200)" />
          </g>
          <circle cx="200" cy="200" r="14" fill="currentColor" />
          <circle className="login__electron" cx="380" cy="200" r="7" fill="#7cb4ff" />
        </svg>
      </section>

      <section className="login__panel">
        <div className="login__card">{cloud ? <CloudLogin /> : <DemoLogin />}</div>
      </section>
    </div>
  );
}

/** Ingreso con cuenta real (Firebase Authentication). */
function CloudLogin() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div>
        <h2>{isRegister ? 'Crear cuenta' : '¡Hola! Ingresá a tu aula'}</h2>
        <p className="muted">{isRegister ? 'Completá tus datos para sumarte al curso.' : 'Usá el email y la contraseña de tu cuenta.'}</p>
      </div>

      {isRegister && (
        <label className="field">
          <span className="field__label">Nombre</span>
          <input className="input" value={form.name} onChange={set('name')} autoComplete="given-name" required />
        </label>
      )}
      <label className="field">
        <span className="field__label">Email</span>
        <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
      </label>
      <label className="field">
        <span className="field__label">Contraseña</span>
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={set('password')}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={6}
          required
        />
      </label>

      {error && (
        <p className="form__error">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
      </button>

      <p className="login__switch">
        {isRegister ? '¿Ya tenés cuenta?' : '¿Sos nuevo en el curso?'}{' '}
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError('');
          }}
        >
          {isRegister ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </p>
    </form>
  );
}

/** Modo demostración: se elige un usuario de prueba. */
function DemoLogin() {
  const { users } = useStore();
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const teacher = users.find((user) => user.role === 'teacher');
  const students = users.filter((user) => user.role === 'student');
  const [studentId, setStudentId] = useState(students[0]?.id);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await loginDemo(role === 'teacher' ? teacher.id : studentId);
    navigate('/inicio');
  };

  return (
    <>
      {!role ? (
        <>
          <h2>¡Hola! ¿Cómo querés entrar?</h2>
          <p className="muted">Elegí tu perfil para continuar.</p>
          <div className="role-options">
            <button className="role-option" onClick={() => setRole('teacher')}>
              <span className="role-option__icon">
                <Presentation size={26} />
              </span>
              <span className="role-option__text">
                <strong>Profesor</strong>
                <span>Subí material, creá ejercicios y dictá clases en vivo.</span>
              </span>
              <ArrowRight size={18} />
            </button>
            <button className="role-option" onClick={() => setRole('student')}>
              <span className="role-option__icon role-option__icon--alt">
                <GraduationCap size={26} />
              </span>
              <span className="role-option__text">
                <strong>Alumno</strong>
                <span>Consultá el material, resolvé ejercicios y sumate a la clase.</span>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          <button type="button" className="btn btn--ghost btn--sm login__back" onClick={() => setRole(null)}>
            <ArrowLeft size={16} /> Volver
          </button>
          <h2>{role === 'teacher' ? 'Ingreso de profesor' : 'Ingreso de alumno'}</h2>

          {role === 'teacher' ? (
            <div className="login__teacher">
              <UserAvatar user={teacher} size={48} />
              <div>
                <strong>{teacher.displayName}</strong>
                <span className="muted">{teacher.email}</span>
              </div>
            </div>
          ) : (
            <div className="field">
              <span className="field__label">¿Quién sos?</span>
              <div className="student-picker">
                {students.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    className={`student-picker__item ${studentId === student.id ? 'is-active' : ''}`}
                    onClick={() => setStudentId(student.id)}
                  >
                    <UserAvatar user={student} size={42} />
                    <span>{student.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="field">
            <span className="field__label">Contraseña</span>
            <input className="input" type="password" defaultValue="demo1234" autoComplete="current-password" />
          </label>

          <button type="submit" className="btn btn--primary btn--lg btn--block">
            Ingresar
          </button>
        </form>
      )}

      <p className="login__note">
        <Info size={15} />
        Modo demostración con datos de prueba. Para probar la pizarra en tiempo real, abrí otra pestaña e ingresá con el otro perfil.
      </p>
    </>
  );
}
