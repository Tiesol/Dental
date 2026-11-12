import type { SlotResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { formatearHora, formatearRangoHora, hoyEnClinica } from '@/shared/lib/dates';
import { useSlotsDisponibles } from '../hooks/useSlotsDisponibles';

type Props = {
  dentistId: string;
  serviceId: string;
  fecha: string;
  onCambiarFecha: (fecha: string) => void;
  onElegir: (slot: SlotResponse) => void;
};

// Elige fecha y horario. Lo usan la reserva y la reprogramación. Al montarse consulta de nuevo, así
// que volver a este paso siempre muestra la disponibilidad actual.
export function SelectorHorario({ dentistId, serviceId, fecha, onCambiarFecha, onElegir }: Props) {
  const { estado } = useSlotsDisponibles(dentistId, serviceId, fecha);

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
        <ul className="slots" aria-label="Horarios disponibles">
          {estado.datos.map((slot) => (
            <li key={slot.inicio}>
              <Button
                variant="secondary"
                onClick={() => onElegir(slot)}
                data-testid={`slot-${formatearHora(slot.inicio)}`}
              >
                {formatearRangoHora(slot.inicio, slot.fin)}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
