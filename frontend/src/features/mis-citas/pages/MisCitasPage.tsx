import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { AppointmentWhen } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useLoader } from '@/shared/hooks/useLoader';
import { formatDate, formatTimeRange } from '@/shared/lib/dates';

const TABS: { valor: AppointmentWhen; label: string }[] = [
  { valor: 'proximas', label: 'Próximas' },
  { valor: 'historial', label: 'Historial' },
];

// Próximas citas e historial del paciente autenticado. La separación la hace el backend.
export function MisCitasPage() {
  const [when, setWhen] = useState<AppointmentWhen>('proximas');
  const load = useCallback((signal: AbortSignal) => appointmentsApi.mine(when, signal), [when]);
  const { state } = useLoader(load);
  const { state: locationState } = useLocation() as { state: { success?: string } | null };
  const tabs = useRef<Partial<Record<AppointmentWhen, HTMLButtonElement | null>>>({});

  // Patrón de pestañas: las flechas cambian de pestaña y solo la activa está en el orden de Tab.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const other = when === 'proximas' ? 'historial' : 'proximas';
    setWhen(other);
    tabs.current[other]?.focus();
  };

  return (
    <div className="page">
      <PageHeader
        title="Mis citas"
        description="Próximas e historial."
        actions={
          <ButtonLink to="/reservar" data-testid="link-reservar">
            Reservar cita
          </ButtonLink>
        }
      />

      {locationState?.success && <SuccessMessage>{locationState.success}</SuccessMessage>}

      <div className="tabs" role="tablist" aria-label="Mis citas">
        {TABS.map(({ valor: value, label }) => (
          <Button
            key={value}
            variant="tab"
            role="tab"
            id={`pestania-${value}`}
            ref={(button) => {
              tabs.current[value] = button;
            }}
            aria-selected={when === value}
            aria-controls="panel-mis-citas"
            tabIndex={when === value ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => setWhen(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <section
        className="card card-flush"
        id="panel-mis-citas"
        role="tabpanel"
        aria-labelledby={`pestania-${when}`}
      >
        {state.status === 'cargando' && <LoadingState />}
        {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
        {state.status === 'ok' && state.data.length === 0 && when === 'proximas' && (
          <EmptyState
            title="No tienes citas próximas"
            description="Reserva una cita para verla aquí."
          />
        )}
        {state.status === 'ok' && state.data.length === 0 && when === 'historial' && (
          <EmptyState title="Tu historial está vacío" />
        )}
        {state.status === 'ok' && state.data.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Odontólogo</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((appointment) => (
                  <tr key={appointment.id} data-testid={`cita-${appointment.id}`}>
                    <td className="cell-primary">{appointment.servicio.nombre}</td>
                    <td>{appointment.odontologo.nombre}</td>
                    <td>{formatDate(appointment.horaInicio)}</td>
                    <td>{formatTimeRange(appointment.horaInicio, appointment.horaFin)}</td>
                    <td>
                      <EstadoCitaBadge status={appointment.estado} />
                    </td>
                    <td>
                      <div className="actions">
                        <ButtonLink
                          variant="secondary"
                          to={`/mis-citas/${appointment.id}`}
                          aria-label={`Ver detalle de ${appointment.servicio.nombre}`}
                        >
                          <span className="btn-label">
                            Ver detalle
                            <Icon name="chevron-right" />
                          </span>
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
