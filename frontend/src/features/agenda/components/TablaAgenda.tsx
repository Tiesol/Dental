import { Link } from 'react-router-dom';
import type { AppointmentResponse } from '@/api/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';

type Props = { citas: AppointmentResponse[]; vacio: string };

// Citas en el orden que devuelve el backend, con los datos que pide el PDF: paciente, servicio,
// estado y observación.
export function TablaAgenda({ citas, vacio }: Props) {
  if (citas.length === 0) return <EmptyState title={vacio} />;

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
          {citas.map((cita) => {
            const paciente = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
            return (
              <tr key={cita.id} data-testid={`cita-${cita.id}`}>
                <td className="cell-primary">{paciente}</td>
                <td>{cita.servicio.nombre}</td>
                <td>
                  {formatearFecha(cita.horaInicio)}
                  <br />
                  {formatearRangoHora(cita.horaInicio, cita.horaFin)}
                </td>
                <td>
                  <EstadoCitaBadge estado={cita.estado} />
                </td>
                <td>{cita.observacion?.texto ?? <span className="muted">Sin observación</span>}</td>
                <td>
                  <div className="actions">
                    <Link to={`/agenda/${cita.id}`} aria-label={`Abrir cita de ${paciente}`}>
                      Abrir
                    </Link>
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
