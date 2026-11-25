import { useId } from 'react';
import type { SlotResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatTime, todayInClinic } from '@/shared/lib/dates';
import { formatDuration } from '@/shared/lib/format';
import { useAvailableSlots } from '../hooks/useAvailableSlots';
import { groupByPeriod, slotMinutes } from '../lib/day-periods';

type Props = {
  dentistId: string;
  serviceId: string;
  date: string;
  onDateChange: (date: string) => void;
  onChoose: (slot: SlotResponse) => void;
};

// Elige fecha y horario. Lo usan la reserva y la reprogramación. Al montarse consulta de nuevo, así
// que volver a este paso siempre muestra la disponibilidad actual. Cada botón muestra solo la hora
// de inicio: los horarios se ofrecen cada 15 minutos y, escritos como rangos, parecían solaparse.
export function SelectorHorario({ dentistId, serviceId, date, onDateChange, onChoose }: Props) {
  const { state } = useAvailableSlots(dentistId, serviceId, date);
  const periodId = useId();

  return (
    <div className="selector-horario">
      <DateField
        label="Fecha"
        value={date}
        min={todayInClinic()}
        onChange={onDateChange}
        data-testid="input-fecha"
      />
      {!date && <p className="muted">Elige una fecha para ver sus horarios.</p>}
      {date && state.status === 'cargando' && <LoadingState />}
      {date && state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {date && state.status === 'ok' && state.data.length === 0 && (
        <EmptyState
          title="No hay horarios disponibles para esta fecha"
          description="Prueba con otra fecha."
        />
      )}
      {date && state.status === 'ok' && state.data.length > 0 && (
        <>
          <p className="muted">
            Cada cita dura {formatDuration(slotMinutes(state.data[0]))}. Elige a qué hora empezar.
          </p>
          {groupByPeriod(state.data).map((period) => (
            <div className="slots-turno" key={period.name}>
              <h3 id={`${periodId}-${period.name}`}>{period.name}</h3>
              <ul className="slots" aria-labelledby={`${periodId}-${period.name}`}>
                {period.slots.map((slot) => (
                  <li key={slot.inicio}>
                    <Button
                      variant="secondary"
                      onClick={() => onChoose(slot)}
                      aria-label={`${formatTime(slot.inicio)} a ${formatTime(slot.fin)}`}
                      data-testid={`slot-${formatTime(slot.inicio)}`}
                    >
                      {formatTime(slot.inicio)}
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
