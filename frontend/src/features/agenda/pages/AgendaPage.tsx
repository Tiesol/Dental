import { useCallback } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { TablaAgenda } from '../components/TablaAgenda';

// Agenda del odontólogo autenticado: el backend la toma del token, nunca de un parámetro.
export function AgendaPage() {
  const cargarHoy = useCallback(() => appointmentsApi.agenda(), []);
  const cargarProximas = useCallback(() => appointmentsApi.agendaProximas(), []);
  const { estado: hoy } = useCarga(cargarHoy);
  const { estado: proximas } = useCarga(cargarProximas);

  // "Próximas" también trae las de más tarde hoy; aquí solo se listan una vez, en "Hoy".
  const idsDeHoy = new Set(hoy.status === 'ok' ? hoy.datos.map((cita) => cita.id) : []);

  return (
    <div className="page">
      <PageHeader title="Agenda" description="Tus citas de hoy y las próximas." />

      <section className="card card-flush" aria-labelledby="titulo-agenda-hoy">
        <h2 id="titulo-agenda-hoy" className="card-title">
          Hoy
        </h2>
        {hoy.status === 'cargando' && <LoadingState />}
        {hoy.status === 'error' && <ErrorMessage>{hoy.mensaje}</ErrorMessage>}
        {hoy.status === 'ok' && <TablaAgenda citas={hoy.datos} vacio="No tienes citas para hoy" />}
      </section>

      <section className="card card-flush" aria-labelledby="titulo-agenda-proximas">
        <h2 id="titulo-agenda-proximas" className="card-title">
          Próximas
        </h2>
        {proximas.status === 'cargando' && <LoadingState />}
        {proximas.status === 'error' && <ErrorMessage>{proximas.mensaje}</ErrorMessage>}
        {proximas.status === 'ok' && (
          <TablaAgenda
            citas={proximas.datos.filter((cita) => !idsDeHoy.has(cita.id))}
            vacio="No tienes citas próximas"
          />
        )}
      </section>
    </div>
  );
}
