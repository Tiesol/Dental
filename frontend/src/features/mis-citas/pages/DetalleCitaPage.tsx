import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { useAuth } from '@/features/auth';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { accionesPermitidas } from '@/shared/lib/estados-cita';
import { PanelReprogramar } from '../components/PanelReprogramar';

const VOLVER = { to: '/mis-citas', label: 'Volver a Mis citas' };

// Detalle de una cita del paciente. Una cita ajena responde 403 y aquí solo se ve ese mensaje.
export function DetalleCitaPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const cargar = useCallback(() => appointmentsApi.porId(id), [id]);
  const { estado, recargar } = useCarga(cargar);
  const { confirm, dialog } = useConfirm();
  const [reprogramando, setReprogramando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState('');

  const cancelar = async () => {
    const ok = await confirm({
      title: '¿Cancelar esta cita?',
      message: 'El horario quedará disponible para otros pacientes.',
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
    });
    if (!ok) return;
    setError('');
    setCancelando(true);
    try {
      await appointmentsApi.cancelar(id);
      recargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancelando(false);
    }
  };

  if (estado.status === 'cargando') return <LoadingState />;
  if (estado.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Detalle de la cita" back={VOLVER} />
        <ErrorMessage>{estado.mensaje}</ErrorMessage>
      </div>
    );
  }

  const cita = estado.datos;
  const acciones = user ? accionesPermitidas(cita.estado, user.role) : [];

  return (
    <div className="page page-narrow">
      <PageHeader title="Detalle de la cita" back={VOLVER} />
      <section className="card">
        <DatosCita cita={cita} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {!reprogramando && acciones.length > 0 && (
          <div className="form-actions">
            {acciones.includes('reprogramar') && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setReprogramando(true);
                }}
                data-testid="btn-reprogramar"
              >
                Reprogramar
              </button>
            )}
            {acciones.includes('cancelar') && (
              <button
                type="button"
                className="secondary danger"
                disabled={cancelando}
                onClick={() => void cancelar()}
                data-testid="btn-cancelar"
              >
                {cancelando ? 'Cancelando…' : 'Cancelar cita'}
              </button>
            )}
          </div>
        )}
      </section>
      {reprogramando && (
        <PanelReprogramar
          cita={cita}
          alTerminar={() => {
            setReprogramando(false);
            recargar();
          }}
          alDesistir={() => setReprogramando(false)}
        />
      )}
      {dialog}
    </div>
  );
}
