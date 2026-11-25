import type { AppointmentStatus } from '@/api/types';
import { statusClass, statusLabel } from '@/shared/lib/appointment-status';

type Props = { status: AppointmentStatus };

// Muestra el estado con el texto exacto del PDF: los E2E lo verifican.
export function EstadoCitaBadge({ status }: Props) {
  return (
    <span className={`badge ${statusClass(status)}`} data-testid="estado-cita">
      {statusLabel(status)}
    </span>
  );
}
