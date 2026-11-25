import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dentistsApi } from '@/api/endpoints/dentists';
import { servicesApi } from '@/api/endpoints/services';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { AsistenteReserva, type EleccionInicial } from '../components/AsistenteReserva';

const SIN_ELECCION: EleccionInicial = { servicio: null, odontologo: null };

// Reserva de una cita. Se llega desde Mis citas, o desde una fila de Servicios (?servicio=) u
// Odontólogos (?odontologo=) con eso ya elegido; el enlace de volver lleva a esa pantalla.
export function ReservaPage() {
  const [params] = useSearchParams();
  const servicioId = params.get('servicio');
  const odontologoId = servicioId ? null : params.get('odontologo');

  const cargar = useCallback(
    async (signal: AbortSignal): Promise<EleccionInicial> => ({
      servicio: servicioId ? await servicesApi.obtener(servicioId) : null,
      odontologo: odontologoId ? await dentistsApi.obtener(odontologoId, signal) : null,
    }),
    [servicioId, odontologoId],
  );
  const { estado } = useCarga(cargar);

  const volver = servicioId
    ? { to: '/servicios', label: 'Servicios' }
    : odontologoId
      ? { to: '/odontologos', label: 'Odontólogos' }
      : { to: '/mis-citas', label: 'Mis citas' };
  const conEleccion = !!(servicioId || odontologoId);

  return (
    <div className="page page-narrow">
      <PageHeader
        back={volver}
        title="Reservar cita"
        description="Elige servicio, odontólogo y horario."
      />
      {!conEleccion && <AsistenteReserva inicial={SIN_ELECCION} />}
      {conEleccion && estado.status === 'cargando' && <LoadingState />}
      {conEleccion && estado.status === 'error' && (
        <>
          <ErrorMessage>{estado.mensaje}</ErrorMessage>
          <AsistenteReserva inicial={SIN_ELECCION} />
        </>
      )}
      {conEleccion && estado.status === 'ok' && <AsistenteReserva inicial={estado.datos} />}
    </div>
  );
}
