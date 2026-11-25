import { useCallback } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useLoader } from '@/shared/hooks/useLoader';
import { TablaAgenda } from '../components/TablaAgenda';

// Agenda del odontólogo autenticado: el backend la toma del token, nunca de un parámetro.
export function AgendaPage() {
  const loadToday = useCallback(
    (signal: AbortSignal) => appointmentsApi.agenda(undefined, signal),
    [],
  );
  const loadUpcoming = useCallback(
    (signal: AbortSignal) => appointmentsApi.upcomingAgenda(signal),
    [],
  );
  const { state: today } = useLoader(loadToday);
  const { state: upcoming } = useLoader(loadUpcoming);

  // "Próximas" también trae las de más tarde hoy; aquí solo se listan una vez, en "Hoy".
  const todayIds = new Set(
    today.status === 'ok' ? today.data.map((appointment) => appointment.id) : [],
  );

  return (
    <div className="page">
      <PageHeader title="Agenda" description="Tus citas de hoy y las próximas." />

      <section className="card card-flush" aria-labelledby="titulo-agenda-hoy">
        <h2 id="titulo-agenda-hoy" className="card-title">
          Hoy
        </h2>
        {today.status === 'cargando' && <LoadingState />}
        {today.status === 'error' && <ErrorMessage>{today.message}</ErrorMessage>}
        {today.status === 'ok' && (
          <TablaAgenda appointments={today.data} emptyText="No tienes citas para hoy" />
        )}
      </section>

      <section className="card card-flush" aria-labelledby="titulo-agenda-proximas">
        <h2 id="titulo-agenda-proximas" className="card-title">
          Próximas
        </h2>
        {upcoming.status === 'cargando' && <LoadingState />}
        {upcoming.status === 'error' && <ErrorMessage>{upcoming.message}</ErrorMessage>}
        {upcoming.status === 'ok' && (
          <TablaAgenda
            appointments={upcoming.data.filter((appointment) => !todayIds.has(appointment.id))}
            emptyText="No tienes citas próximas"
          />
        )}
      </section>
    </div>
  );
}
