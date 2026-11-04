import { useCallback, useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistAdminResponse, UpdateDentistRequest } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; odontologo: DentistAdminResponse }
  | { status: 'error'; mensaje: string };

// Un odontólogo para el ADMIN. Las acciones lanzan ApiError para que la página muestre el mensaje.
export function useOdontologoAdmin(id: string) {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    dentistsApi
      .obtenerAdmin(id)
      .then((odontologo) => {
        if (activo) setEstado({ status: 'ok', odontologo });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, [id]);

  const guardarDatos = useCallback(
    async (cambios: UpdateDentistRequest) => {
      setEstado({ status: 'ok', odontologo: await dentistsApi.actualizar(id, cambios) });
    },
    [id],
  );

  const guardarServicios = useCallback(
    async (serviceIds: string[]) => {
      setEstado({ status: 'ok', odontologo: await dentistsApi.asignarServicios(id, serviceIds) });
    },
    [id],
  );

  const cambiarEstado = useCallback(
    async (activo: boolean) => {
      setEstado({ status: 'ok', odontologo: await dentistsApi.cambiarEstado(id, activo) });
    },
    [id],
  );

  return { estado, guardarDatos, guardarServicios, cambiarEstado };
}
