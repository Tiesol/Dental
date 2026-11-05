import { useCallback, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { useAuth } from '@/features/auth';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useCarga } from '@/shared/hooks/useCarga';
import { accionesPermitidas } from '@/shared/lib/estados-cita';

const VOLVER = { to: '/agenda', label: 'Volver a la agenda' };

type Accion = 'iniciar' | 'observacion' | 'finalizar';

// Flujo de atención del odontólogo: iniciar, registrar la observación y finalizar (PDF sección 7).
export function DetalleAtencionPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const cargar = useCallback(() => appointmentsApi.porId(id), [id]);
  const { estado, recargar } = useCarga(cargar);
  const [texto, setTexto] = useState('');
  const [enCurso, setEnCurso] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const ejecutar = async (
    accion: Accion,
    llamada: () => Promise<unknown>,
    mensajeExito: string,
  ) => {
    setError('');
    setExito('');
    setEnCurso(accion);
    try {
      await llamada();
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnCurso(null);
      // También tras un error: la cita pudo haber cambiado por otro lado.
      recargar();
    }
  };

  const iniciar = () =>
    void ejecutar(
      'iniciar',
      () => appointmentsApi.cambiarEstado(id, 'EN_ATENCION'),
      'Atención iniciada',
    );

  const finalizar = () =>
    void ejecutar(
      'finalizar',
      () => appointmentsApi.cambiarEstado(id, 'FINALIZADA'),
      'Cita finalizada',
    );

  const registrar = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(
      'observacion',
      () => appointmentsApi.registrarObservacion(id, texto),
      'Observación registrada',
    );
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
        {exito && <SuccessMessage>{exito}</SuccessMessage>}
        {acciones.includes('iniciar-atencion') && (
          <div className="form-actions">
            <button
              type="button"
              disabled={enCurso !== null}
              onClick={iniciar}
              data-testid="btn-iniciar-atencion"
            >
              {enCurso === 'iniciar' ? 'Iniciando…' : 'Iniciar atención'}
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
            <button
              type="submit"
              disabled={enCurso !== null}
              data-testid="btn-registrar-observacion"
            >
              {enCurso === 'observacion' ? 'Guardando…' : 'Registrar observación'}
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
              disabled={enCurso !== null || !cita.observacion}
              onClick={finalizar}
              data-testid="btn-finalizar"
            >
              {enCurso === 'finalizar' ? 'Finalizando…' : 'Finalizar'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
