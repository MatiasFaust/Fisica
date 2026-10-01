import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { connectCloud, disconnectCloud, updateState } from '../services/store';
import { isFirebaseConfigured } from '../services/firebase';
import { createCloudSeed } from '../services/seed';
import { useStore } from '../hooks/useStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const state = useStore();
  // Demo: id del usuario elegido. Firebase: uid de la cuenta (undefined mientras se verifica la sesión).
  const [userId, setUserId] = useState(() => (isFirebaseConfigured ? undefined : authService.getCurrentUserId()));
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return authService.onAuthChange((account) => {
      setFirebaseUser(account);
      setUserId(account?.uid ?? null);
      if (account) connectCloud();
      else disconnectCloud();
    });
  }, []);

  const user = state.users.find((item) => item.id === userId) ?? null;

  // Cuenta sin perfil (por ejemplo, si falló el registro a mitad de camino): se crea.
  // Se espera unos segundos para no pisar el perfil que está guardando el registro.
  useEffect(() => {
    if (!firebaseUser || !state.loaded || user) return undefined;
    const timer = setTimeout(() => authService.createProfile(firebaseUser), 4000);
    return () => clearTimeout(timer);
  }, [firebaseUser, state.loaded, user]);

  // Primer ingreso del profesor a un proyecto vacío: carga el contenido de ejemplo.
  const seeded = useRef(false);
  useEffect(() => {
    if (!isFirebaseConfigured || !state.loaded || user?.role !== 'teacher' || seeded.current) return;
    seeded.current = true;
    if (state.folders.length === 0) updateState((current) => ({ ...current, ...createCloudSeed(user.id) }));
  }, [state.loaded, state.folders.length, user]);

  const loginDemo = useCallback(async (id) => {
    await authService.loginDemo(id);
    setUserId(id);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    if (!isFirebaseConfigured) setUserId(null);
  }, []);

  const loading = isFirebaseConfigured && (userId === undefined || (userId && (!state.loaded || !user)));

  const value = useMemo(
    () => ({
      user,
      isTeacher: user?.role === 'teacher',
      loading,
      cloud: isFirebaseConfigured,
      loginDemo,
      login: authService.login,
      register: authService.register,
      logout,
    }),
    [user, loading, loginDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
