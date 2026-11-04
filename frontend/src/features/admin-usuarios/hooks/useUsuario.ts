import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UpdateUserRequest, UserDetail } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; usuario: UserDetail }
  | { status: 'error'; mensaje: string };

// Detalle de un usuario para el ADMIN: cargar, guardar cambios y habilitar/deshabilitar.
// guardar y cambiarEstado lanzan ApiError para que el formulario muestre el mensaje.
export function useUsuario(id: string) {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    usersApi
      .obtener(id)
      .then((usuario) => {
        if (activo) setEstado({ status: 'ok', usuario });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, [id]);

  const guardar = useCallback(
    async (cambios: UpdateUserRequest) => {
      const usuario = await usersApi.actualizar(id, cambios);
      setEstado({ status: 'ok', usuario });
    },
    [id],
  );

  const cambiarEstado = useCallback(
    async (activo: boolean) => {
      const usuario = await usersApi.cambiarEstado(id, activo);
      setEstado({ status: 'ok', usuario });
    },
    [id],
  );

  return { estado, guardar, cambiarEstado };
}
