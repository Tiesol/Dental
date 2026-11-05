import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import type { DentistPublicResponse, ServiceResponse, SlotResponse } from '@/api/types';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatearFecha, formatearRangoHora, hoyEnClinica } from '@/shared/lib/dates';
import { PasoOdontologo } from '../components/PasoOdontologo';
import { PasoServicio } from '../components/PasoServicio';
import { SelectorHorario } from '../components/SelectorHorario';

// Asistente de reserva: servicio, odontólogo, fecha y hora, y confirmación (PDF sección 6).
export function ReservaPage() {
  const navigate = useNavigate();
  const [servicio, setServicio] = useState<ServiceResponse | null>(null);
  const [odontologo, setOdontologo] = useState<DentistPublicResponse | null>(null);
  const [fecha, setFecha] = useState(hoyEnClinica);
  const [slot, setSlot] = useState<SlotResponse | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cambiarServicio = () => {
    setServicio(null);
    setOdontologo(null);
    setSlot(null);
    setError('');
  };

  const cambiarOdontologo = () => {
    setOdontologo(null);
    setSlot(null);
    setError('');
  };

  const confirmar = async () => {
    if (!servicio || !odontologo || !slot) return;
    setError('');
    setEnviando(true);
    try {
      await appointmentsApi.reservar({
        dentistId: odontologo.id,
        serviceId: servicio.id,
        horaInicio: slot.inicio,
      });
      navigate('/mis-citas', { state: { exito: 'Cita reservada' } });
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
      // Otro paciente se adelantó: al volver al paso de horarios se consulta la lista de nuevo.
      if (err instanceof ApiError && err.statusCode === 409) setSlot(null);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Reservar cita" description="Elige servicio, odontólogo y horario." />
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!servicio && (
        <PasoServicio
          onElegir={(elegido) => {
            setError('');
            setServicio(elegido);
          }}
        />
      )}

      {servicio && (
        <div className="eleccion">
          <span>
            Servicio: <strong>{servicio.nombre}</strong>
          </span>
          <button type="button" className="secondary" onClick={cambiarServicio}>
            Cambiar servicio
          </button>
        </div>
      )}

      {servicio && !odontologo && (
        <PasoOdontologo
          serviceId={servicio.id}
          onElegir={(elegido) => {
            setError('');
            setOdontologo(elegido);
          }}
        />
      )}

      {odontologo && (
        <div className="eleccion">
          <span>
            Odontólogo: <strong>{odontologo.nombre}</strong>
          </span>
          <button type="button" className="secondary" onClick={cambiarOdontologo}>
            Cambiar odontólogo
          </button>
        </div>
      )}

      {servicio && odontologo && !slot && (
        <section className="card" aria-labelledby="titulo-paso-horario">
          <h2 id="titulo-paso-horario">3. Elige fecha y horario</h2>
          <SelectorHorario
            dentistId={odontologo.id}
            serviceId={servicio.id}
            fecha={fecha}
            onCambiarFecha={setFecha}
            onElegir={(elegido) => {
              setError('');
              setSlot(elegido);
            }}
          />
        </section>
      )}

      {servicio && odontologo && slot && (
        <section className="card" aria-labelledby="titulo-paso-confirmar">
          <h2 id="titulo-paso-confirmar">4. Confirma tu cita</h2>
          <dl className="details" data-testid="resumen-reserva">
            <dt>Servicio</dt>
            <dd>{servicio.nombre}</dd>
            <dt>Odontólogo</dt>
            <dd>{odontologo.nombre}</dd>
            <dt>Fecha</dt>
            <dd>{formatearFecha(slot.inicio)}</dd>
            <dt>Horario</dt>
            <dd>{formatearRangoHora(slot.inicio, slot.fin)}</dd>
          </dl>
          <div className="form-actions">
            <button
              type="button"
              disabled={enviando}
              onClick={() => void confirmar()}
              data-testid="btn-reservar"
            >
              {enviando ? 'Reservando…' : 'Confirmar reserva'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={enviando}
              onClick={() => setSlot(null)}
            >
              Elegir otro horario
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
