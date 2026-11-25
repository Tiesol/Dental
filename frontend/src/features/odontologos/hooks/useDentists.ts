import { useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistPublicResponse } from '@/api/types';

type Result =
  { status: 'ok'; dentists: DentistPublicResponse[] } | { status: 'error'; message: string };

type State = { status: 'cargando' } | Result;

// Odontólogos que aceptan citas (vista del paciente), opcionalmente solo los que realizan un servicio.
// Cada respuesta se guarda junto al filtro que la pidió: si el filtro cambió, se considera
// "cargando" sin tener que poner el estado a mano dentro del efecto. Al cambiar el filtro se cancela
// la petición anterior.
export function useDentists(serviceId?: string): State {
  const [result, setResult] = useState<{ filter?: string; data: Result } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    dentistsApi
      .list(serviceId, controller.signal)
      .then((dentists) => {
        if (!controller.signal.aborted) {
          setResult({ filter: serviceId, data: { status: 'ok', dentists } });
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setResult({ filter: serviceId, data: { status: 'error', message: err.message } });
        }
      });
    return () => controller.abort();
  }, [serviceId]);

  if (!result || result.filter !== serviceId) return { status: 'cargando' };
  return result.data;
}
