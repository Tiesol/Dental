import { useEffect, useState } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistPublicResponse } from '@/api/types';

type Resultado =
  { status: 'ok'; odontologos: DentistPublicResponse[] } | { status: 'error'; mensaje: string };

type Estado = { status: 'cargando' } | Resultado;

// Odontólogos que aceptan citas (vista del paciente), opcionalmente solo los que realizan un servicio.
// Cada respuesta se guarda junto al filtro que la pidió: si el filtro cambió, se considera
// "cargando" sin tener que poner el estado a mano dentro del efecto.
export function useOdontologos(serviceId?: string): Estado {
  const [resultado, setResultado] = useState<{ filtro?: string; datos: Resultado } | null>(null);

  useEffect(() => {
    let activo = true;
    dentistsApi
      .listar(serviceId)
      .then((odontologos) => {
        if (activo) setResultado({ filtro: serviceId, datos: { status: 'ok', odontologos } });
      })
      .catch((err: Error) => {
        if (activo)
          setResultado({ filtro: serviceId, datos: { status: 'error', mensaje: err.message } });
      });
    return () => {
      activo = false;
    };
  }, [serviceId]);

  if (!resultado || resultado.filtro !== serviceId) return { status: 'cargando' };
  return resultado.datos;
}
