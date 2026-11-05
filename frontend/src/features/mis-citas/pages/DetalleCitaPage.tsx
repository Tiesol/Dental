import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/features/auth';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
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
  const [exito, setExito] = useState('');

  const limpiarMensajes = () => {
    setError('');
    setExito('');
  };

  // Un 409 o 403 significa que la cita pudo cambiar por otro lado: se muestra su estado real.
  const alFallar = (err: Error) => {
    setError(err.message);
    if (err instanceof ApiError && (err.statusCode === 409 || err.statusCode === 403)) {
      recargar();
    }
  };

  const cancelar = async () => {
    const ok = await confirm({
      title: '¿Cancelar esta cita?',
      message: 'El horario quedará disponible para otros pacientes.',
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
    });
    if (!ok) return;
    limpiarMensajes();
    setCancelando(true);
    try {
      await appointmentsApi.cancelar(id);
      setExito('Cita cancelada');
      recargar();
    } catch (err) {
      alFallar(err as Error);
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
  const puedeReprogramar = acciones.includes('reprogramar');

  return (
    <div className="page page-narrow">
      <PageHeader title="Detalle de la cita" back={VOLVER} />
      <section className="card">
        <DatosCita cita={cita} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {exito && <SuccessMessage>{exito}</SuccessMessage>}
        {!reprogramando && acciones.length > 0 && (
          <div className="form-actions">
            {puedeReprogramar && (
              <button
                type="button"
                onClick={() => {
                  limpiarMensajes();
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
      {reprogramando && puedeReprogramar && (
        <PanelReprogramar
          cita={cita}
          alElegir={limpiarMensajes}
          alTerminar={() => {
            setReprogramando(false);
            setExito('Cita reprogramada');
            recargar();
          }}
          alFallar={alFallar}
          alDesistir={() => setReprogramando(false)}
        />
      )}
      {dialog}
    </div>
  );
}
