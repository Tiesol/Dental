import type { AppointmentResponse } from '@/api/types';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';
import { EstadoCitaBadge } from './EstadoCitaBadge';

type Props = { cita: AppointmentResponse; mostrarPaciente?: boolean };

// Datos de una cita. El paciente solo se muestra a quien atiende o administra.
export function DatosCita({ cita, mostrarPaciente = false }: Props) {
  return (
    <dl className="details" data-testid="datos-cita">
      <dt>Estado</dt>
      <dd>
        <EstadoCitaBadge estado={cita.estado} />
      </dd>
      {mostrarPaciente && (
        <>
          <dt>Paciente</dt>
          <dd>
            {cita.paciente.nombre} {cita.paciente.apellido}
            {cita.paciente.telefono && ` · ${cita.paciente.telefono}`}
          </dd>
        </>
      )}
      <dt>Servicio</dt>
      <dd>{cita.servicio.nombre}</dd>
      <dt>Odontólogo</dt>
      <dd>{cita.odontologo.nombre}</dd>
      <dt>Fecha</dt>
      <dd>{formatearFecha(cita.horaInicio)}</dd>
      <dt>Horario</dt>
      <dd>{formatearRangoHora(cita.horaInicio, cita.horaFin)}</dd>
      {cita.observacion && (
        <>
          <dt>Observación</dt>
          <dd data-testid="observacion-cita">{cita.observacion.texto}</dd>
        </>
      )}
    </dl>
  );
}
