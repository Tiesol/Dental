import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints/users';
import type { UserDetail } from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; usuarios: UserDetail[] }
  | { status: 'error'; mensaje: string };

// Listado de usuarios para el ADMIN, con la acción de habilitar/deshabilitar en línea.
export function useUsuarios() {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' });

  useEffect(() => {
    let activo = true;
    usersApi
      .listar()
      .then((usuarios) => {
        if (activo) setEstado({ status: 'ok', usuarios });
      })
      .catch((err: Error) => {
        if (activo) setEstado({ status: 'error', mensaje: err.message });
      });
    return () => {
      activo = false;
    };
  }, []);

  // Devuelve el mensaje de error (o null) para que la página lo muestre junto a la fila.
  const cambiarEstado = useCallback(async (id: string, nuevo: boolean): Promise<string | null> => {
    try {
      const actualizado = await usersApi.cambiarEstado(id, nuevo);
      setEstado((e) =>
        e.status === 'ok'
          ? { ...e, usuarios: e.usuarios.map((u) => (u.id === id ? actualizado : u)) }
          : e,
      );
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }, []);

  return { estado, cambiarEstado };
}
