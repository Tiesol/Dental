import { useState } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import type { AppointmentResponse, SlotResponse } from '@/api/types';
import { SelectorHorario } from '@/features/reserva';
import { Button } from '@/shared/components/Button';
import { dateInClinic, formatDate, formatTimeRange } from '@/shared/lib/dates';

type Props = {
  appointment: AppointmentResponse;
  onDone: (rescheduled: AppointmentResponse) => void;
  onFail: (error: Error) => void;
  onCancel: () => void;
  onChoose: () => void;
};

// Elige otro horario del mismo odontólogo y servicio. Si falla, la cita conserva el suyo.
export function PanelReprogramar({ appointment, onDone, onFail, onCancel, onChoose }: Props) {
  const [date, setDate] = useState(() => dateInClinic(appointment.horaInicio));
  const [slot, setSlot] = useState<SlotResponse | null>(null);
  const [sending, setSending] = useState(false);

  const confirm = async () => {
    if (!slot) return;
    setSending(true);
    try {
      onDone(await appointmentsApi.reschedule(appointment.id, slot.inicio));
    } catch (err) {
      onFail(err as Error);
      setSending(false);
      // Al volver a la lista, SelectorHorario consulta de nuevo la disponibilidad.
      if (err instanceof ApiError && err.statusCode === 409) setSlot(null);
    }
  };

  return (
    <section className="card" aria-labelledby="titulo-reprogramar">
      <h2 id="titulo-reprogramar">Reprogramar cita</h2>
      {!slot && (
        <SelectorHorario
          dentistId={appointment.odontologo.id}
          serviceId={appointment.servicio.id}
          date={date}
          onDateChange={setDate}
          onChoose={(chosen) => {
            onChoose();
            setSlot(chosen);
          }}
        />
      )}
      {slot && (
        <dl className="details" data-testid="resumen-reprogramacion">
          <dt>Nueva fecha</dt>
          <dd>{formatDate(slot.inicio)}</dd>
          <dt>Nuevo horario</dt>
          <dd>{formatTimeRange(slot.inicio, slot.fin)}</dd>
        </dl>
      )}
      <div className="form-actions">
        {slot && (
          <Button
            loading={sending}
            onClick={() => void confirm()}
            data-testid="btn-confirmar-reprogramacion"
          >
            Confirmar nuevo horario
          </Button>
        )}
        {slot && (
          <Button variant="secondary" disabled={sending} onClick={() => setSlot(null)}>
            Elegir otro horario
          </Button>
        )}
        <Button variant="secondary" disabled={sending} onClick={onCancel}>
          Volver a la cita
        </Button>
      </div>
    </section>
  );
}
