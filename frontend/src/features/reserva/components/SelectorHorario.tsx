import { useId } from 'react';
import type { SlotResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatearHora, hoyEnClinica } from '@/shared/lib/dates';
import { formatearDuracion } from '@/shared/lib/formato';
import { useSlotsDisponibles } from '../hooks/useSlotsDisponibles';
import { agruparPorTurno, minutosDeSlot } from '../lib/turnos';

type Props = {
  dentistId: string;
  serviceId: string;
  fecha: string;
  onCambiarFecha: (fecha: string) => void;
  onElegir: (slot: SlotResponse) => void;
};

// Elige fecha y horario. Lo usan la reserva y la reprogramación. Al montarse consulta de nuevo, así
// que volver a este paso siempre muestra la disponibilidad actual. Cada botón muestra solo la hora
// de inicio: los horarios se ofrecen cada 15 minutos y, escritos como rangos, parecían solaparse.
export function SelectorHorario({ dentistId, serviceId, fecha, onCambiarFecha, onElegir }: Props) {
  const { estado } = useSlotsDisponibles(dentistId, serviceId, fecha);
  const idTurno = useId();

  return (
    <div className="selector-horario">
      <DateField
        label="Fecha"
        value={fecha}
        min={hoyEnClinica()}
        onChange={onCambiarFecha}
        data-testid="input-fecha"
      />
      {!fecha && <p className="muted">Elige una fecha para ver sus horarios.</p>}
      {fecha && estado.status === 'cargando' && <LoadingState />}
      {fecha && estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {fecha && estado.status === 'ok' && estado.datos.length === 0 && (
        <EmptyState
          title="No hay horarios disponibles para esta fecha"
          description="Prueba con otra fecha."
        />
      )}
      {fecha && estado.status === 'ok' && estado.datos.length > 0 && (
        <>
          <p className="muted">
            Cada cita dura {formatearDuracion(minutosDeSlot(estado.datos[0]))}. Elige a qué hora
            empezar.
          </p>
          {agruparPorTurno(estado.datos).map((turno) => (
            <div className="slots-turno" key={turno.nombre}>
              <h3 id={`${idTurno}-${turno.nombre}`}>{turno.nombre}</h3>
              <ul className="slots" aria-labelledby={`${idTurno}-${turno.nombre}`}>
                {turno.slots.map((slot) => (
                  <li key={slot.inicio}>
                    <Button
                      variant="secondary"
                      onClick={() => onElegir(slot)}
                      aria-label={`${formatearHora(slot.inicio)} a ${formatearHora(slot.fin)}`}
                      data-testid={`slot-${formatearHora(slot.inicio)}`}
                    >
                      {formatearHora(slot.inicio)}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
