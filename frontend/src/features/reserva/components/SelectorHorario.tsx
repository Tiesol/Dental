import type { SlotResponse } from '@/api/types';
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
      <label>
        Fecha
        <input
          type="date"
          value={fecha}
          min={hoyEnClinica()}
          onChange={(e) => onCambiarFecha(e.target.value)}
          data-testid="input-fecha"
        />
      </label>
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status === 'ok' && estado.datos.length === 0 && (
        <EmptyState
          title="No hay horarios disponibles para esta fecha"
          description="Prueba con otra fecha."
        />
      )}
      {estado.status === 'ok' && estado.datos.length > 0 && (
        <ul className="slots" aria-label="Horarios disponibles">
          {estado.datos.map((slot) => (
            <li key={slot.inicio}>
              <button
                type="button"
                className="secondary"
                onClick={() => onElegir(slot)}
                data-testid={`slot-${formatearHora(slot.inicio)}`}
              >
                {formatearRangoHora(slot.inicio, slot.fin)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
