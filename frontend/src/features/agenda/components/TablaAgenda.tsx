import type { AppointmentResponse } from '@/api/types';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { Icon } from '@/shared/components/Icon';
import { formatDate, formatTimeRange } from '@/shared/lib/dates';

type Props = { appointments: AppointmentResponse[]; emptyText: string };

// Citas en el orden que devuelve el backend, con los datos que pide el PDF: paciente, servicio,
// estado y observación.
export function TablaAgenda({ appointments, emptyText }: Props) {
  if (appointments.length === 0) return <EmptyState title={emptyText} />;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Servicio</th>
            <th>Fecha y horario</th>
            <th>Estado</th>
            <th>Observación</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const patient = `${appointment.paciente.nombre} ${appointment.paciente.apellido}`;
            return (
              <tr key={appointment.id} data-testid={`cita-${appointment.id}`}>
                <td className="cell-primary">{patient}</td>
                <td>{appointment.servicio.nombre}</td>
                <td>
                  {formatDate(appointment.horaInicio)}
                  <br />
                  {formatTimeRange(appointment.horaInicio, appointment.horaFin)}
                </td>
                <td>
                  <EstadoCitaBadge status={appointment.estado} />
                </td>
                <td>
                  {appointment.observacion?.texto ?? <span className="muted">Sin observación</span>}
                </td>
                <td>
                  <div className="actions">
                    <ButtonLink
                      variant="secondary"
                      to={`/agenda/${appointment.id}`}
                      aria-label={`Abrir cita de ${patient}`}
                    >
                      <span className="btn-label">
                        Abrir
                        <Icon name="chevron-right" />
                      </span>
                    </ButtonLink>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
