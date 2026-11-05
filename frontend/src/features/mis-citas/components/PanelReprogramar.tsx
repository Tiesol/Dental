import { useState } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import type { AppointmentResponse, SlotResponse } from '@/api/types';
import { SelectorHorario } from '@/features/reserva';
import { fechaEnClinica, formatearFecha, formatearRangoHora } from '@/shared/lib/dates';

type Props = {
  cita: AppointmentResponse;
  alTerminar: () => void;
  alFallar: (error: Error) => void;
  alDesistir: () => void;
  alElegir: () => void;
};

// Elige otro horario del mismo odontólogo y servicio. Si falla, la cita conserva el suyo.
export function PanelReprogramar({ cita, alTerminar, alFallar, alDesistir, alElegir }: Props) {
  const [fecha, setFecha] = useState(() => fechaEnClinica(cita.horaInicio));
  const [slot, setSlot] = useState<SlotResponse | null>(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!slot) return;
    setEnviando(true);
    try {
      await appointmentsApi.reprogramar(cita.id, slot.inicio);
      alTerminar();
    } catch (err) {
      alFallar(err as Error);
      setEnviando(false);
      // Al volver a la lista, SelectorHorario consulta de nuevo la disponibilidad.
      if (err instanceof ApiError && err.statusCode === 409) setSlot(null);
    }
  };

  return (
    <section className="card" aria-labelledby="titulo-reprogramar">
      <h2 id="titulo-reprogramar">Reprogramar cita</h2>
      {!slot && (
        <SelectorHorario
          dentistId={cita.odontologo.id}
          serviceId={cita.servicio.id}
          fecha={fecha}
          onCambiarFecha={setFecha}
          onElegir={(elegido) => {
            alElegir();
            setSlot(elegido);
          }}
        />
      )}
      {slot && (
        <dl className="details" data-testid="resumen-reprogramacion">
          <dt>Nueva fecha</dt>
          <dd>{formatearFecha(slot.inicio)}</dd>
          <dt>Nuevo horario</dt>
          <dd>{formatearRangoHora(slot.inicio, slot.fin)}</dd>
        </dl>
      )}
      <div className="form-actions">
        {slot && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => void confirmar()}
            data-testid="btn-confirmar-reprogramacion"
          >
            {enviando ? 'Reprogramando…' : 'Confirmar nuevo horario'}
          </button>
        )}
        {slot && (
          <button
            type="button"
            className="secondary"
            disabled={enviando}
            onClick={() => setSlot(null)}
          >
            Elegir otro horario
          </button>
        )}
        <button type="button" className="secondary" disabled={enviando} onClick={alDesistir}>
          Volver a la cita
        </button>
      </div>
    </section>
  );
}
