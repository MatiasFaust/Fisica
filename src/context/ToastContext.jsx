import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { uid } from '../utils/id';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const notify = useCallback(
    (message, { type = 'success', action, duration = 3800 } = {}) => {
      const id = uid('toast-');
      setToasts((list) => [...list.slice(-3), { id, message, type, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      notify,
      success: (message, options) => notify(message, { ...options, type: 'success' }),
      error: (message, options) => notify(message, { ...options, type: 'error', duration: 5000 }),
      info: (message, options) => notify(message, { ...options, type: 'info' }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`}>
              <Icon size={18} />
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  className="toast__action"
                  onClick={() => {
                    toast.action.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button className="icon-btn icon-btn--sm" onClick={() => dismiss(toast.id)} aria-label="Cerrar">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
