import { useCallback, useEffect, useState } from 'react';
import { availabilityApi } from '@/api/endpoints/availability';
import type {
  AvailabilityResponse,
  AvailabilityRuleRequest,
  CreateBlockRequest,
} from '@/api/types';

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; disponibilidad: AvailabilityResponse }
  | { status: 'error'; mensaje: string };

// Horarios y bloques de un odontólogo (ADMIN). Las acciones lanzan ApiError para que la página
// muestre el mensaje.
export function useDisponibilidad(dentistId: string) {
  const [resultado, setResultado] = useState<{ dentistId: string; estado: Estado } | null>(null);

  useEffect(() => {
    let activo = true;
    availabilityApi
      .obtener(dentistId)
      .then((disponibilidad) => {
        if (activo) setResultado({ dentistId, estado: { status: 'ok', disponibilidad } });
      })
      .catch((err: Error) => {
        if (activo) setResultado({ dentistId, estado: { status: 'error', mensaje: err.message } });
      });
    return () => {
      activo = false;
    };
  }, [dentistId]);

  const actualizarBloques = useCallback(
    (cambio: (bloques: AvailabilityResponse['bloques']) => AvailabilityResponse['bloques']) => {
      setResultado((actual) =>
        actual?.dentistId === dentistId && actual.estado.status === 'ok'
          ? {
              dentistId,
              estado: {
                status: 'ok',
                disponibilidad: {
                  ...actual.estado.disponibilidad,
                  bloques: cambio(actual.estado.disponibilidad.bloques),
                },
              },
            }
          : actual,
      );
    },
    [dentistId],
  );

  const guardarHorarios = useCallback(
    async (horarios: AvailabilityRuleRequest[]) => {
      const disponibilidad = await availabilityApi.reemplazarHorarios(dentistId, horarios);
      setResultado({ dentistId, estado: { status: 'ok', disponibilidad } });
    },
    [dentistId],
  );

  const crearBloque = useCallback(
    async (cuerpo: CreateBlockRequest) => {
      const bloque = await availabilityApi.crearBloque(dentistId, cuerpo);
      actualizarBloques((bloques) =>
        [...bloques, bloque].sort((a, b) => a.inicio.localeCompare(b.inicio)),
      );
    },
    [dentistId, actualizarBloques],
  );

  const borrarBloque = useCallback(
    async (blockId: string) => {
      await availabilityApi.borrarBloque(dentistId, blockId);
      actualizarBloques((bloques) => bloques.filter((b) => b.id !== blockId));
    },
    [dentistId, actualizarBloques],
  );

  const estado: Estado =
    resultado?.dentistId === dentistId ? resultado.estado : { status: 'cargando' };

  return { estado, guardarHorarios, crearBloque, borrarBloque };
}
