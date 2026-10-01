import { useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { openFile, downloadFile } from '../services/repositoryService';

/** Abrir y descargar archivos mostrando un aviso si algo falla. */
export function useFileActions() {
  const toast = useToast();
  return useMemo(
    () => ({
      open: (file) => openFile(file).catch((error) => toast.error(error.message)),
      download: (file) =>
        downloadFile(file)
          .then(() => toast.info(`Descargando «${file.name}»`))
          .catch((error) => toast.error(error.message)),
    }),
    [toast],
  );
}
