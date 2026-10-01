import { useSyncExternalStore } from 'react';
import { getState, subscribe } from '../services/store';

/** Devuelve el estado completo de la base de datos y se actualiza ante cualquier cambio. */
export function useStore() {
  return useSyncExternalStore(subscribe, getState);
}
