import { useCallback, useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse, UpdateServiceRequest } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; servicio: ServiceResponse }
  | { status: 'error'; mensaje: string };

// Un servicio para editarlo (ADMIN). guardar y cambiarEstado lanzan ApiError si el backend rechaza.
export function useServicio(id: string) {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    servicesApi
      .obtener(id)
      .then((servicio) => {
        if (activo) setEstado({ status: 'ok', servicio });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, [id]);

  const guardar = useCallback(
    async (cambios: UpdateServiceRequest) => {
      setEstado({ status: 'ok', servicio: await servicesApi.actualizar(id, cambios) });
    },
    [id],
  );

  const cambiarEstado = useCallback(
    async (activo: boolean) => {
      setEstado({ status: 'ok', servicio: await servicesApi.cambiarEstado(id, activo) });
    },
    [id],
  );

  return { estado, guardar, cambiarEstado };
}
