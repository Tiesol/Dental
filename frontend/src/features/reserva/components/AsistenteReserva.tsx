import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import type { DentistPublicResponse, ServiceResponse, SlotResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { formatDate, formatTimeRange, todayInClinic } from '@/shared/lib/dates';
import { PasoOdontologo } from './PasoOdontologo';
import { PasoServicio } from './PasoServicio';
import { PasosReserva } from './PasosReserva';
import { SelectorHorario } from './SelectorHorario';

export type InitialChoice = {
  service: ServiceResponse | null;
  dentist: DentistPublicResponse | null;
};

type Props = { initial: InitialChoice };

// Pasos de la reserva: servicio, odontólogo, fecha y hora, y confirmación (PDF sección 6). Si se
// llega desde un odontólogo, el orden se invierte: primero él y después uno de sus servicios.
export function AsistenteReserva({ initial }: Props) {
  const navigate = useNavigate();
  const [service, setService] = useState(initial.service);
  const [dentist, setDentist] = useState(initial.dentist);
  const [fromDentist, setFromDentist] = useState(!!initial.dentist && !initial.service);
  const [date, setDate] = useState(todayInClinic);
  const [slot, setSlot] = useState<SlotResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Desde un odontólogo, cambiar el servicio lo conserva: sus servicios siguen siendo la lista.
  const changeService = () => {
    setService(null);
    if (!fromDentist) setDentist(null);
    setSlot(null);
    setError('');
  };

  const changeDentist = () => {
    setDentist(null);
    setFromDentist(false);
    setSlot(null);
    setError('');
  };

  const confirm = async () => {
    if (!service || !dentist || !slot) return;
    setError('');
    setSending(true);
    try {
      await appointmentsApi.book({
        dentistId: dentist.id,
        serviceId: service.id,
        horaInicio: slot.inicio,
      });
      navigate('/mis-citas', { state: { success: 'Cita reservada' } });
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
      // Otro paciente se adelantó: al volver al paso de horarios se consulta la lista de nuevo.
      if (err instanceof ApiError && err.statusCode === 409) setSlot(null);
    }
  };

  const serviceChoice = service && (
    <div className="eleccion">
      <span>
        Servicio: <strong>{service.nombre}</strong>
      </span>
      <Button variant="secondary" onClick={changeService}>
        Cambiar servicio
      </Button>
    </div>
  );

  const dentistChoice = dentist && (
    <div className="eleccion">
      <span>
        Odontólogo: <strong>{dentist.nombre}</strong>
      </span>
      <Button variant="secondary" onClick={changeDentist}>
        Cambiar odontólogo
      </Button>
    </div>
  );

  // El orden sigue al de la elección; el paso actual es el primero que falta.
  const steps = fromDentist
    ? ['Odontólogo', 'Servicio', 'Horario', 'Confirmar']
    : ['Servicio', 'Odontólogo', 'Horario', 'Confirmar'];
  const first = fromDentist ? dentist : service;
  const currentStep = !first ? 0 : !(service && dentist) ? 1 : !slot ? 2 : 3;

  return (
    <>
      <PasosReserva steps={steps} current={currentStep} />
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {fromDentist ? dentistChoice : serviceChoice}
      {fromDentist ? serviceChoice : dentistChoice}

      {!service && (
        <PasoServicio
          dentist={fromDentist ? dentist : null}
          onChoose={(chosen) => {
            setError('');
            setService(chosen);
          }}
        />
      )}

      {service && !dentist && (
        <PasoOdontologo
          serviceId={service.id}
          onChoose={(chosen) => {
            setError('');
            setDentist(chosen);
          }}
        />
      )}

      {service && dentist && !slot && (
        <section className="card" aria-labelledby="titulo-paso-horario">
          <h2 id="titulo-paso-horario">3. Elige fecha y horario</h2>
          <SelectorHorario
            dentistId={dentist.id}
            serviceId={service.id}
            date={date}
            onDateChange={setDate}
            onChoose={(chosen) => {
              setError('');
              setSlot(chosen);
            }}
          />
        </section>
      )}

      {service && dentist && slot && (
        <section className="card" aria-labelledby="titulo-paso-confirmar">
          <h2 id="titulo-paso-confirmar">4. Confirma tu cita</h2>
          <dl className="details" data-testid="resumen-reserva">
            <dt>Servicio</dt>
            <dd>{service.nombre}</dd>
            <dt>Odontólogo</dt>
            <dd>{dentist.nombre}</dd>
            <dt>Fecha</dt>
            <dd>{formatDate(slot.inicio)}</dd>
            <dt>Horario</dt>
            <dd>{formatTimeRange(slot.inicio, slot.fin)}</dd>
          </dl>
          <div className="form-actions">
            <Button loading={sending} onClick={() => void confirm()} data-testid="btn-reservar">
              Confirmar reserva
            </Button>
            <Button variant="secondary" disabled={sending} onClick={() => setSlot(null)}>
              Elegir otro horario
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
