import { useCallback, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { AppointmentResponse, AppointmentStatus } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/Button';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextArea } from '@/shared/components/TextArea';
import { useLoader } from '@/shared/hooks/useLoader';
import { useForm } from '@/shared/hooks/useForm';
import { allowedActions } from '@/shared/lib/appointment-status';
import { required } from '@/shared/lib/validators';

const BACK = { to: '/agenda', label: 'Volver a la agenda' };

type Action = 'confirmar' | 'iniciar' | 'observacion' | 'finalizar';

// Flujo de atención del odontólogo: confirmar, iniciar, registrar la observación y finalizar
// (PDF sección 7).
export function DetalleAtencionPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const load = useCallback((signal: AbortSignal) => appointmentsApi.byId(id, signal), [id]);
  const { state, reload, update } = useLoader(load);
  const form = useForm({ texto: '' }, { texto: required('Escribe la observación de la atención') });
  const [inProgress, setInProgress] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cada acción cambia solo esta cita y se aplica con la respuesta del backend. Tras un error se
  // vuelve a pedir la cita, porque pudo haber cambiado por otro lado.
  const run = async (
    action: Action,
    call: () => Promise<(appointment: AppointmentResponse) => AppointmentResponse>,
    successMessage: string,
  ) => {
    setError('');
    setSuccess('');
    setInProgress(action);
    try {
      update(await call());
      setSuccess(successMessage);
    } catch (err) {
      setError((err as Error).message);
      reload();
    } finally {
      setInProgress(null);
    }
  };

  const changeStatus = async (newValue: AppointmentStatus) => {
    const updated = await appointmentsApi.changeStatus(id, newValue);
    return () => updated;
  };

  const confirm = () => void run('confirmar', () => changeStatus('CONFIRMADA'), 'Cita confirmada');

  const start = () => void run('iniciar', () => changeStatus('EN_ATENCION'), 'Atención iniciada');

  const finish = () => void run('finalizar', () => changeStatus('FINALIZADA'), 'Cita finalizada');

  const register = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    await run(
      'observacion',
      async () => {
        const observation = await appointmentsApi.registerObservation(id, form.values.texto.trim());
        return (appointment) => ({ ...appointment, observacion: observation });
      },
      'Observación registrada',
    );
  };

  if (state.status === 'cargando') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Atención de la cita" back={BACK} />
        <ErrorMessage>{state.message}</ErrorMessage>
      </div>
    );
  }

  const appointment = state.data;
  const actions = user ? allowedActions(appointment.estado, user.role) : [];

  return (
    <div className="page page-narrow">
      <PageHeader title="Atención de la cita" back={BACK} />
      <section className="card">
        <DatosCita appointment={appointment} showPatient />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        {actions.includes('confirmar') && (
          <div className="form-actions">
            <Button
              loading={inProgress === 'confirmar'}
              disabled={inProgress !== null}
              onClick={confirm}
              data-testid="btn-confirmar-cita"
            >
              Confirmar cita
            </Button>
          </div>
        )}
        {actions.includes('iniciar-atencion') && (
          <div className="form-actions">
            <Button
              loading={inProgress === 'iniciar'}
              disabled={inProgress !== null}
              onClick={start}
              data-testid="btn-iniciar-atencion"
            >
              Iniciar atención
            </Button>
          </div>
        )}
      </section>

      {actions.includes('registrar-observacion') && !appointment.observacion && (
        <form className="card" onSubmit={register} aria-labelledby="titulo-observacion" noValidate>
          <h2 id="titulo-observacion">Observación de la atención</h2>
          <TextArea {...form.field('texto')} label="Observación" maxLength={2000} rows={4} />
          <div className="form-actions">
            <Button
              type="submit"
              loading={inProgress === 'observacion'}
              disabled={inProgress !== null}
              data-testid="btn-registrar-observacion"
            >
              Registrar observación
            </Button>
          </div>
        </form>
      )}

      {actions.includes('finalizar') && (
        <section className="card" aria-labelledby="titulo-finalizar">
          <div className="card-section">
            <h2 id="titulo-finalizar">Finalizar la cita</h2>
            {!appointment.observacion && (
              <p className="muted">Registra la observación para poder finalizar.</p>
            )}
          </div>
          <div className="form-actions">
            <Button
              loading={inProgress === 'finalizar'}
              disabled={inProgress !== null || !appointment.observacion}
              onClick={finish}
              data-testid="btn-finalizar"
            >
              Finalizar
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
