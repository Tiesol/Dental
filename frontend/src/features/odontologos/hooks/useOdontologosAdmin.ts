import { useCallback, useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistAdminResponse } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; odontologos: DentistAdminResponse[] }
  | { status: 'error'; mensaje: string };

// Listado completo para el ADMIN, con habilitar/deshabilitar en línea (devuelve error o null).
export function useOdontologosAdmin() {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    dentistsApi
      .listarAdmin()
      .then((odontologos) => {
        if (activo) setEstado({ status: 'ok', odontologos });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, []);

  const cambiarEstado = useCallback(async (id: string, nuevo: boolean): Promise<string | null> => {
    try {
      const actualizado = await dentistsApi.cambiarEstado(id, nuevo);
      setEstado((e) =>
        e.status === 'ok'
          ? { ...e, odontologos: e.odontologos.map((d) => (d.id === id ? actualizado : d)) }
          : e,
      );
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }, []);

  return { estado, cambiarEstado };
}
