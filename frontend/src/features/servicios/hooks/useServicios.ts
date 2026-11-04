import { useCallback, useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; servicios: ServiceResponse[] }
  | { status: 'error'; mensaje: string };

// Catálogo de servicios. El backend decide qué ve cada rol (el paciente, solo los habilitados).
// cambiarEstado (solo ADMIN) devuelve el mensaje de error o null.
export function useServicios() {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    servicesApi
      .listar()
      .then((servicios) => {
        if (activo) setEstado({ status: 'ok', servicios });
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
      const actualizado = await servicesApi.cambiarEstado(id, nuevo);
      setEstado((e) =>
        e.status === 'ok'
          ? { ...e, servicios: e.servicios.map((s) => (s.id === id ? actualizado : s)) }
          : e,
      );
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }, []);

  return { estado, cambiarEstado };
}
