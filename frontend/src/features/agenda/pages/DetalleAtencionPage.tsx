import { useCallback, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsApi } from '@/api/endpoints/appointments';
import type { AppointmentResponse, EstadoCita } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/Button';
import { DatosCita } from '@/shared/components/DatosCita';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextArea } from '@/shared/components/TextArea';
import { useCarga } from '@/shared/hooks/useCarga';
import { useForm } from '@/shared/hooks/useForm';
import { accionesPermitidas } from '@/shared/lib/estados-cita';
import { required } from '@/shared/lib/validators';

const VOLVER = { to: '/agenda', label: 'Volver a la agenda' };

type Accion = 'iniciar' | 'observacion' | 'finalizar';

// Flujo de atención del odontólogo: iniciar, registrar la observación y finalizar (PDF sección 7).
export function DetalleAtencionPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const cargar = useCallback((signal: AbortSignal) => appointmentsApi.porId(id, signal), [id]);
  const { estado, recargar, actualizar } = useCarga(cargar);
  const form = useForm({ texto: '' }, { texto: required('Escribe la observación de la atención') });
  const [enCurso, setEnCurso] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cada acción cambia solo esta cita y se aplica con la respuesta del backend. Tras un error se
  // vuelve a pedir la cita, porque pudo haber cambiado por otro lado.
  const ejecutar = async (
    accion: Accion,
    llamada: () => Promise<(cita: AppointmentResponse) => AppointmentResponse>,
    mensajeExito: string,
  ) => {
    setError('');
    setExito('');
    setEnCurso(accion);
    try {
      actualizar(await llamada());
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
      recargar();
    } finally {
      setEnCurso(null);
    }
  };

  const cambiarEstado = async (nuevo: EstadoCita) => {
    const actualizada = await appointmentsApi.cambiarEstado(id, nuevo);
    return () => actualizada;
  };

  const iniciar = () =>
    void ejecutar('iniciar', () => cambiarEstado('EN_ATENCION'), 'Atención iniciada');

  const finalizar = () =>
    void ejecutar('finalizar', () => cambiarEstado('FINALIZADA'), 'Cita finalizada');

  const registrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    await ejecutar(
      'observacion',
      async () => {
        const observacion = await appointmentsApi.registrarObservacion(
          id,
          form.values.texto.trim(),
        );
        return (cita) => ({ ...cita, observacion });
      },
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
            <Button
              loading={enCurso === 'iniciar'}
              disabled={enCurso !== null}
              onClick={iniciar}
              data-testid="btn-iniciar-atencion"
            >
              Iniciar atención
            </Button>
          </div>
        )}
      </section>

      {acciones.includes('registrar-observacion') && !cita.observacion && (
        <form className="card" onSubmit={registrar} aria-labelledby="titulo-observacion" noValidate>
          <h2 id="titulo-observacion">Observación de la atención</h2>
          <TextArea {...form.field('texto')} label="Observación" maxLength={2000} rows={4} />
          <div className="form-actions">
            <Button
              type="submit"
              loading={enCurso === 'observacion'}
              disabled={enCurso !== null}
              data-testid="btn-registrar-observacion"
            >
              Registrar observación
            </Button>
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
            <Button
              loading={enCurso === 'finalizar'}
              disabled={enCurso !== null || !cita.observacion}
              onClick={finalizar}
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
