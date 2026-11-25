import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import type { DentistPublicResponse, ServiceResponse, SlotResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { formatearFecha, formatearRangoHora, hoyEnClinica } from '@/shared/lib/dates';
import { PasoOdontologo } from './PasoOdontologo';
import { PasoServicio } from './PasoServicio';
import { SelectorHorario } from './SelectorHorario';

export type EleccionInicial = {
  servicio: ServiceResponse | null;
  odontologo: DentistPublicResponse | null;
};

type Props = { inicial: EleccionInicial };

// Pasos de la reserva: servicio, odontólogo, fecha y hora, y confirmación (PDF sección 6). Si se
// llega desde un odontólogo, el orden se invierte: primero él y después uno de sus servicios.
export function AsistenteReserva({ inicial }: Props) {
  const navigate = useNavigate();
  const [servicio, setServicio] = useState(inicial.servicio);
  const [odontologo, setOdontologo] = useState(inicial.odontologo);
  const [desdeOdontologo, setDesdeOdontologo] = useState(!!inicial.odontologo && !inicial.servicio);
  const [fecha, setFecha] = useState(hoyEnClinica);
  const [slot, setSlot] = useState<SlotResponse | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Desde un odontólogo, cambiar el servicio lo conserva: sus servicios siguen siendo la lista.
  const cambiarServicio = () => {
    setServicio(null);
    if (!desdeOdontologo) setOdontologo(null);
    setSlot(null);
    setError('');
  };

  const cambiarOdontologo = () => {
    setOdontologo(null);
    setDesdeOdontologo(false);
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

  const eleccionServicio = servicio && (
    <div className="eleccion">
      <span>
        Servicio: <strong>{servicio.nombre}</strong>
      </span>
      <Button variant="secondary" onClick={cambiarServicio}>
        Cambiar servicio
      </Button>
    </div>
  );

  const eleccionOdontologo = odontologo && (
    <div className="eleccion">
      <span>
        Odontólogo: <strong>{odontologo.nombre}</strong>
      </span>
      <Button variant="secondary" onClick={cambiarOdontologo}>
        Cambiar odontólogo
      </Button>
    </div>
  );

  return (
    <>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {desdeOdontologo ? eleccionOdontologo : eleccionServicio}
      {desdeOdontologo ? eleccionServicio : eleccionOdontologo}

      {!servicio && (
        <PasoServicio
          odontologo={desdeOdontologo ? odontologo : null}
          onElegir={(elegido) => {
            setError('');
            setServicio(elegido);
          }}
        />
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
            <Button loading={enviando} onClick={() => void confirmar()} data-testid="btn-reservar">
              Confirmar reserva
            </Button>
            <Button variant="secondary" disabled={enviando} onClick={() => setSlot(null)}>
              Elegir otro horario
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
