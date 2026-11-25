import { useCallback, useEffect, useState } from 'react';
import { availabilityApi } from '@/api/endpoints/availability';
import type {
  AvailabilityResponse,
  AvailabilityRuleRequest,
  CreateBlockRequest,
} from '@/api/types';

type State =
  | { status: 'cargando' }
  | { status: 'ok'; availability: AvailabilityResponse }
  | { status: 'error'; message: string };

// Horarios y bloques de un odontólogo (ADMIN). Las acciones lanzan ApiError para que la página
// muestre el mensaje.
export function useAvailability(dentistId: string) {
  const [result, setResult] = useState<{ dentistId: string; state: State } | null>(null);

  useEffect(() => {
    let active = true;
    availabilityApi
      .get(dentistId)
      .then((availability) => {
        if (active) setResult({ dentistId, state: { status: 'ok', availability } });
      })
      .catch((err: Error) => {
        if (active) setResult({ dentistId, state: { status: 'error', message: err.message } });
      });
    return () => {
      active = false;
    };
  }, [dentistId]);

  const updateBlocks = useCallback(
    (change: (blocks: AvailabilityResponse['bloques']) => AvailabilityResponse['bloques']) => {
      setResult((current) =>
        current?.dentistId === dentistId && current.state.status === 'ok'
          ? {
              dentistId,
              state: {
                status: 'ok',
                availability: {
                  ...current.state.availability,
                  bloques: change(current.state.availability.bloques),
                },
              },
            }
          : current,
      );
    },
    [dentistId],
  );

  const saveSchedule = useCallback(
    async (schedule: AvailabilityRuleRequest[]) => {
      const availability = await availabilityApi.replaceSchedule(dentistId, schedule);
      setResult({ dentistId, state: { status: 'ok', availability } });
    },
    [dentistId],
  );

  const createBlock = useCallback(
    async (body: CreateBlockRequest) => {
      const block = await availabilityApi.createBlock(dentistId, body);
      updateBlocks((blocks) => [...blocks, block].sort((a, b) => a.inicio.localeCompare(b.inicio)));
    },
    [dentistId, updateBlocks],
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      await availabilityApi.deleteBlock(dentistId, blockId);
      updateBlocks((blocks) => blocks.filter((b) => b.id !== blockId));
    },
    [dentistId, updateBlocks],
  );

  const state: State = result?.dentistId === dentistId ? result.state : { status: 'cargando' };

  return { state, saveSchedule, createBlock, deleteBlock };
}
