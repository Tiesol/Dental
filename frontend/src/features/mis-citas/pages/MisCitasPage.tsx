import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { CuandoCitas } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useCarga } from '@/shared/hooks/useCarga';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';

const PESTANIAS: { valor: CuandoCitas; etiqueta: string }[] = [
  { valor: 'proximas', etiqueta: 'Próximas' },
  { valor: 'historial', etiqueta: 'Historial' },
];

// Próximas citas e historial del paciente autenticado. La separación la hace el backend.
export function MisCitasPage() {
  const [cuando, setCuando] = useState<CuandoCitas>('proximas');
  const cargar = useCallback(
    (signal: AbortSignal) => appointmentsApi.mias(cuando, signal),
    [cuando],
  );
  const { estado } = useCarga(cargar);
  const { state } = useLocation() as { state: { exito?: string } | null };
  const pestanias = useRef<Partial<Record<CuandoCitas, HTMLButtonElement | null>>>({});

  // Patrón de pestañas: las flechas cambian de pestaña y solo la activa está en el orden de Tab.
  const alPulsarTecla = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const otra = cuando === 'proximas' ? 'historial' : 'proximas';
    setCuando(otra);
    pestanias.current[otra]?.focus();
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

      {state?.exito && <SuccessMessage>{state.exito}</SuccessMessage>}

      <div className="tabs" role="tablist" aria-label="Mis citas">
        {PESTANIAS.map(({ valor, etiqueta }) => (
          <Button
            key={valor}
            variant="tab"
            role="tab"
            id={`pestania-${valor}`}
            ref={(boton) => {
              pestanias.current[valor] = boton;
            }}
            aria-selected={cuando === valor}
            aria-controls="panel-mis-citas"
            tabIndex={cuando === valor ? 0 : -1}
            onKeyDown={alPulsarTecla}
            onClick={() => setCuando(valor)}
          >
            {etiqueta}
          </Button>
        ))}
      </div>

      <section
        className="card card-flush"
        id="panel-mis-citas"
        role="tabpanel"
        aria-labelledby={`pestania-${cuando}`}
      >
        {estado.status === 'cargando' && <LoadingState />}
        {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
        {estado.status === 'ok' && estado.datos.length === 0 && cuando === 'proximas' && (
          <EmptyState
            title="No tienes citas próximas"
            description="Reserva una cita para verla aquí."
          />
        )}
        {estado.status === 'ok' && estado.datos.length === 0 && cuando === 'historial' && (
          <EmptyState title="Tu historial está vacío" />
        )}
        {estado.status === 'ok' && estado.datos.length > 0 && (
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
                {estado.datos.map((cita) => (
                  <tr key={cita.id} data-testid={`cita-${cita.id}`}>
                    <td className="cell-primary">{cita.servicio.nombre}</td>
                    <td>{cita.odontologo.nombre}</td>
                    <td>{formatearFecha(cita.horaInicio)}</td>
                    <td>{formatearRangoHora(cita.horaInicio, cita.horaFin)}</td>
                    <td>
                      <EstadoCitaBadge estado={cita.estado} />
                    </td>
                    <td>
                      <div className="actions">
                        <Link
                          to={`/mis-citas/${cita.id}`}
                          aria-label={`Ver detalle de ${cita.servicio.nombre}`}
                        >
                          Ver detalle
                        </Link>
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
