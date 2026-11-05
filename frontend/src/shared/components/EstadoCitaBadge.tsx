import type { EstadoCita } from '@/api/types';
import { claseEstado, etiquetaEstado } from '@/shared/lib/estados-cita';

type Props = { estado: EstadoCita };

// Muestra el estado con el texto exacto del PDF: los E2E lo verifican.
export function EstadoCitaBadge({ estado }: Props) {
  return (
    <span className={`badge ${claseEstado(estado)}`} data-testid="estado-cita">
      {etiquetaEstado(estado)}
    </span>
  );
}
