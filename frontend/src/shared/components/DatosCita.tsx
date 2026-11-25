import type { AppointmentResponse } from '@/api/types';
import { formatDate, formatTimeRange } from '@/shared/lib/dates';
import { EstadoCitaBadge } from './EstadoCitaBadge';

type Props = { appointment: AppointmentResponse; showPatient?: boolean };

// Datos de una cita. El paciente solo se muestra a quien atiende o administra.
export function DatosCita({ appointment, showPatient = false }: Props) {
  return (
    <dl className="details" data-testid="datos-cita">
      <dt>Estado</dt>
      <dd>
        <EstadoCitaBadge status={appointment.estado} />
      </dd>
      {showPatient && (
        <>
          <dt>Paciente</dt>
          <dd>
            {appointment.paciente.nombre} {appointment.paciente.apellido}
            {appointment.paciente.telefono && ` · ${appointment.paciente.telefono}`}
          </dd>
        </>
      )}
      <dt>Servicio</dt>
      <dd>{appointment.servicio.nombre}</dd>
      <dt>Odontólogo</dt>
      <dd>{appointment.odontologo.nombre}</dd>
      <dt>Fecha</dt>
      <dd>{formatDate(appointment.horaInicio)}</dd>
      <dt>Horario</dt>
      <dd>{formatTimeRange(appointment.horaInicio, appointment.horaFin)}</dd>
      {appointment.observacion && (
        <>
          <dt>Observación</dt>
          <dd data-testid="observacion-cita">{appointment.observacion.texto}</dd>
        </>
      )}
    </dl>
  );
}
