import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/Button';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useLoader } from '@/shared/hooks/useLoader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { allowedActions } from '@/shared/lib/appointment-status';
import { PanelReprogramar } from '../components/PanelReprogramar';

const BACK = { to: '/mis-citas', label: 'Volver a Mis citas' };

// Detalle de una cita del paciente. Una cita ajena responde 403 y aquí solo se ve ese mensaje.
export function DetalleCitaPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const load = useCallback((signal: AbortSignal) => appointmentsApi.byId(id, signal), [id]);
  const { state, reload, update } = useLoader(load);
  const { confirm, dialog } = useConfirm();
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Un 409 o 403 significa que la cita pudo cambiar por otro lado: se muestra su estado real.
  const onFail = (err: Error) => {
    setError(err.message);
    if (err instanceof ApiError && (err.statusCode === 409 || err.statusCode === 403)) {
      reload();
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: '¿Cancelar esta cita?',
      message: 'El horario quedará disponible para otros pacientes.',
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
    });
    if (!ok) return;
    clearMessages();
    setCancelling(true);
    try {
      const cancelled = await appointmentsApi.cancel(id);
      update(() => cancelled);
      setSuccess('Cita cancelada');
    } catch (err) {
      onFail(err as Error);
    } finally {
      setCancelling(false);
    }
  };

  if (state.status === 'cargando') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Detalle de la cita" back={BACK} />
        <ErrorMessage>{state.message}</ErrorMessage>
      </div>
    );
  }

  const appointment = state.data;
  const actions = user ? allowedActions(appointment.estado, user.role) : [];
  const canReschedule = actions.includes('reprogramar');

  return (
    <div className="page page-narrow">
      <PageHeader title="Detalle de la cita" back={BACK} />
      <section className="card">
        <DatosCita appointment={appointment} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        {!rescheduling && actions.length > 0 && (
          <div className="form-actions">
            {canReschedule && (
              <Button
                disabled={cancelling}
                onClick={() => {
                  clearMessages();
                  setRescheduling(true);
                }}
                data-testid="btn-reprogramar"
              >
                Reprogramar
              </Button>
            )}
            {actions.includes('cancelar') && (
              <Button
                variant="danger-outline"
                loading={cancelling}
                onClick={() => void cancel()}
                data-testid="btn-cancelar"
              >
                Cancelar cita
              </Button>
            )}
          </div>
        )}
      </section>
      {rescheduling && canReschedule && (
        <PanelReprogramar
          appointment={appointment}
          onChoose={clearMessages}
          onDone={(rescheduled) => {
            update(() => rescheduled);
            setRescheduling(false);
            setSuccess('Cita reprogramada');
          }}
          onFail={onFail}
          onCancel={() => setRescheduling(false)}
        />
      )}
      {dialog}
    </div>
  );
}
