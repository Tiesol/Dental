import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dentistsApi } from '@/api/endpoints/dentists';
import { servicesApi } from '@/api/endpoints/services';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useLoader } from '@/shared/hooks/useLoader';
import { AsistenteReserva, type InitialChoice } from '../components/AsistenteReserva';

const NO_CHOICE: InitialChoice = { service: null, dentist: null };

// Reserva de una cita. Se llega desde Mis citas, o desde una fila de Servicios (?servicio=) u
// Odontólogos (?odontologo=) con eso ya elegido; el enlace de volver lleva a esa pantalla.
export function ReservaPage() {
  const [params] = useSearchParams();
  const serviceId = params.get('servicio');
  const dentistId = serviceId ? null : params.get('odontologo');

  const load = useCallback(
    async (signal: AbortSignal): Promise<InitialChoice> => ({
      service: serviceId ? await servicesApi.get(serviceId) : null,
      dentist: dentistId ? await dentistsApi.get(dentistId, signal) : null,
    }),
    [serviceId, dentistId],
  );
  const { state } = useLoader(load);

  const goBack = serviceId
    ? { to: '/servicios', label: 'Servicios' }
    : dentistId
      ? { to: '/odontologos', label: 'Odontólogos' }
      : { to: '/mis-citas', label: 'Mis citas' };
  const withChoice = !!(serviceId || dentistId);

  return (
    <div className="page page-narrow">
      <PageHeader
        back={goBack}
        title="Reservar cita"
        description="Elige servicio, odontólogo y horario."
      />
      {!withChoice && <AsistenteReserva initial={NO_CHOICE} />}
      {withChoice && state.status === 'cargando' && <LoadingState />}
      {withChoice && state.status === 'error' && (
        <>
          <ErrorMessage>{state.message}</ErrorMessage>
          <AsistenteReserva initial={NO_CHOICE} />
        </>
      )}
      {withChoice && state.status === 'ok' && <AsistenteReserva initial={state.data} />}
    </div>
  );
}
