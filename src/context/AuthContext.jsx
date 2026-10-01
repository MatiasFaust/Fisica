import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { connectCloud, disconnectCloud, updateState } from '../services/store';
import { isFirebaseConfigured as cloud } from '../services/firebase';
import { createCloudSeed } from '../services/seed';
import { STUDENT_STATUS } from '../services/studentService';
import { useStore } from '../hooks/useStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const state = useStore();
  // Demo: id del usuario de prueba elegido en esta pestaña.
  const [demoUserId, setDemoUserId] = useState(() => (cloud ? null : authService.getCurrentUserId()));
  // Firebase: cuenta de Authentication (undefined mientras se verifica) y su perfil de Firestore.
  const [account, setAccount] = useState(cloud ? undefined : null);
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    if (!cloud) return undefined;
    let stopProfile = null;
    const stopAuth = authService.onAuthChange((nextAccount) => {
      stopProfile?.();
      stopProfile = null;
      setAccount(nextAccount ?? null);
      setProfile(nextAccount ? undefined : null);
      if (nextAccount) stopProfile = authService.watchProfile(nextAccount.uid, setProfile);
    });
    return () => {
      stopAuth();
      stopProfile?.();
    };
  }, []);

  // Solo el profesor y los alumnos aprobados acceden a los datos del curso.
  const access = !cloud ? STUDENT_STATUS.approved : profile ? (profile.role === 'teacher' ? STUDENT_STATUS.approved : profile.status ?? STUDENT_STATUS.pending) : null;
  const approved = access === STUDENT_STATUS.approved;

  useEffect(() => {
    if (!cloud) return;
    if (approved) connectCloud();
    else disconnectCloud();
  }, [approved]);

  // Cuenta sin perfil (por ejemplo, si se cortó el registro a mitad de camino): se crea.
  // Se espera unos segundos para no adelantarse al perfil que está guardando el registro.
  useEffect(() => {
    if (!account || profile !== null) return undefined;
    const timer = setTimeout(() => authService.createProfile(account).catch(console.error), 4000);
    return () => clearTimeout(timer);
  }, [account, profile]);

  const userId = cloud ? account?.uid : demoUserId;
  const user = approved && userId ? (state.users.find((item) => item.id === userId) ?? (cloud ? profile : null)) : null;

  // Primer ingreso del profesor a un proyecto vacío: carga el contenido de ejemplo.
  const seeded = useRef(false);
  useEffect(() => {
    if (!cloud || !state.loaded || user?.role !== 'teacher' || seeded.current) return;
    seeded.current = true;
    if (state.folders.length === 0) updateState((current) => ({ ...current, ...createCloudSeed(user.id) }));
  }, [state.loaded, state.folders.length, user]);

  const loginDemo = useCallback(async (id) => {
    await authService.loginDemo(id);
    setDemoUserId(id);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    if (!cloud) setDemoUserId(null);
  }, []);

  const loading = cloud && (account === undefined || (account !== null && !profile) || (approved && !state.loaded));

  const value = useMemo(
    () => ({
      user,
      isTeacher: user?.role === 'teacher',
      loading,
      cloud,
      // Perfil de un alumno que todavía no tiene acceso (pendiente o bloqueado).
      waitingProfile: cloud && profile && !approved ? profile : null,
      loginDemo,
      login: authService.login,
      register: authService.register,
      resetPassword: authService.resetPassword,
      logout,
    }),
    [user, loading, profile, approved, loginDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
