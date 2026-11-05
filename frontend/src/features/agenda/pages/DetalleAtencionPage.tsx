import { useCallback, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { EstadoCita } from '@/api/types';
import { useAuth } from '@/features/auth';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { accionesPermitidas } from '@/shared/lib/estados-cita';

const VOLVER = { to: '/agenda', label: 'Volver a la agenda' };

// Flujo de atención del odontólogo: iniciar, registrar la observación y finalizar (PDF sección 7).
export function DetalleAtencionPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const cargar = useCallback(() => appointmentsApi.porId(id), [id]);
  const { estado, recargar } = useCarga(cargar);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setError('');
    setEnviando(true);
    try {
      await accion();
      recargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstado = (hacia: EstadoCita) =>
    void ejecutar(() => appointmentsApi.cambiarEstado(id, hacia));

  const registrar = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(() => appointmentsApi.registrarObservacion(id, texto));
  };

  if (estado.status === 'cargando') return <LoadingState />;
  if (estado.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Atención de la cita" back={VOLVER} />
        <ErrorMessage>{estado.mensaje}</ErrorMessage>
      </div>
    );
  }

  const cita = estado.datos;
  const acciones = user ? accionesPermitidas(cita.estado, user.role) : [];

  return (
    <div className="page page-narrow">
      <PageHeader title="Atención de la cita" back={VOLVER} />
      <section className="card">
        <DatosCita cita={cita} mostrarPaciente />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {acciones.includes('iniciar-atencion') && (
          <div className="form-actions">
            <button
              type="button"
              disabled={enviando}
              onClick={() => cambiarEstado('EN_ATENCION')}
              data-testid="btn-iniciar-atencion"
            >
              {enviando ? 'Iniciando…' : 'Iniciar atención'}
            </button>
          </div>
        )}
      </section>

      {acciones.includes('registrar-observacion') && !cita.observacion && (
        <form className="card" onSubmit={registrar} aria-labelledby="titulo-observacion">
          <h2 id="titulo-observacion">Observación de la atención</h2>
          <label>
            Observación
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              maxLength={2000}
              rows={4}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={enviando} data-testid="btn-registrar-observacion">
              {enviando ? 'Guardando…' : 'Registrar observación'}
            </button>
          </div>
        </form>
      )}

      {acciones.includes('finalizar') && (
        <section className="card" aria-labelledby="titulo-finalizar">
          <div className="card-section">
            <h2 id="titulo-finalizar">Finalizar la cita</h2>
            {!cita.observacion && (
              <p className="muted">Registra la observación para poder finalizar.</p>
            )}
          </div>
          <div className="form-actions">
            <button
              type="button"
              disabled={enviando || !cita.observacion}
              onClick={() => cambiarEstado('FINALIZADA')}
              data-testid="btn-finalizar"
            >
              {enviando ? 'Finalizando…' : 'Finalizar'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
