import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { CuandoCitas } from '@/api/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';

const PESTANIAS: { valor: CuandoCitas; etiqueta: string }[] = [
  { valor: 'proximas', etiqueta: 'Próximas' },
  { valor: 'historial', etiqueta: 'Historial' },
];

// Próximas citas e historial del paciente autenticado. La separación la hace el backend.
export function MisCitasPage() {
  const [cuando, setCuando] = useState<CuandoCitas>('proximas');
  const cargar = useCallback(() => appointmentsApi.mias(cuando), [cuando]);
  const { estado } = useCarga(cargar);

  return (
    <div className="page">
      <PageHeader
        title="Mis citas"
        description="Próximas e historial."
        actions={
          <Link to="/reservar" className="button" data-testid="link-reservar">
            Reservar cita
          </Link>
        }
      />

      <div className="tabs" role="tablist" aria-label="Mis citas">
        {PESTANIAS.map(({ valor, etiqueta }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={cuando === valor}
            className={cuando === valor ? 'tab tab-active' : 'tab'}
            onClick={() => setCuando(valor)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <section className="card card-flush">
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
