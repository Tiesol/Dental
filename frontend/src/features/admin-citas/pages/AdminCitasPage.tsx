import { useCallback, useState } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { AppointmentResponse, EstadoCita } from '@/api/types';
import { useAuth } from '@/features/auth';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useCarga } from '@/shared/hooks/useCarga';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';
import { accionesPermitidas, etiquetaEstado } from '@/shared/lib/estados-cita';

const LIMITE = 50;
const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA'];

// Todas las citas (ADMIN): filtros, confirmar y cancelar. Los filtros los aplica el backend.
export function AdminCitasPage() {
  const { user } = useAuth();
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoCita | ''>('');
  const [dentistId, setDentistId] = useState('');
  const [offset, setOffset] = useState(0);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');
  const { confirm, dialog } = useConfirm();

  const cargarCitas = useCallback(
    () =>
      appointmentsApi.todas({
        fecha: fecha || undefined,
        estado: estado || undefined,
        dentistId: dentistId || undefined,
        limit: LIMITE,
        offset,
      }),
    [fecha, estado, dentistId, offset],
  );
  const cargarOdontologos = useCallback(() => dentistsApi.listarAdmin(), []);
  const { estado: citas, recargar } = useCarga(cargarCitas);
  const { estado: odontologos } = useCarga(cargarOdontologos);

  const ejecutar = async (citaId: string, accion: () => Promise<unknown>) => {
    setErrorAccion('');
    setProcesando(citaId);
    try {
      await accion();
      recargar();
    } catch (err) {
      setErrorAccion((err as Error).message);
      // La cita pudo haber cambiado por otro lado: se muestra su estado real.
      recargar();
    } finally {
      setProcesando(null);
    }
  };

  const cancelar = async (cita: AppointmentResponse) => {
    const ok = await confirm({
      title: '¿Cancelar esta cita?',
      message: `${cita.paciente.nombre} ${cita.paciente.apellido} perderá su horario, que quedará disponible.`,
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
    });
    if (ok) await ejecutar(cita.id, () => appointmentsApi.cancelar(cita.id));
  };

  // Un filtro nuevo siempre empieza en la primera página.
  const alFiltrar = (cambio: () => void) => {
    cambio();
    setOffset(0);
  };

  return (
    <div className="page">
      <PageHeader title="Citas" description="Todas las citas de la clínica." />

      <section className="card card-flush">
        <div className="filters">
          <label>
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => alFiltrar(() => setFecha(e.target.value))}
            />
          </label>
          <label>
            Estado
            <select
              value={estado}
              onChange={(e) => alFiltrar(() => setEstado(e.target.value as EstadoCita | ''))}
            >
              <option value="">Todos</option>
              {ESTADOS.map((valor) => (
                <option key={valor} value={valor}>
                  {etiquetaEstado(valor)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Odontólogo
            <select
              value={dentistId}
              onChange={(e) => alFiltrar(() => setDentistId(e.target.value))}
            >
              <option value="">Todos</option>
              {odontologos.status === 'ok' &&
                odontologos.datos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {errorAccion && <ErrorMessage>{errorAccion}</ErrorMessage>}
        {citas.status === 'cargando' && <LoadingState />}
        {citas.status === 'error' && <ErrorMessage>{citas.mensaje}</ErrorMessage>}
        {citas.status === 'ok' && citas.datos.length === 0 && (
          <EmptyState title="No hay citas con estos filtros" />
        )}
        {citas.status === 'ok' && citas.datos.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Odontólogo</th>
                  <th>Servicio</th>
                  <th>Fecha y horario</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {citas.datos.map((cita) => {
                  const acciones = user ? accionesPermitidas(cita.estado, user.role) : [];
                  return (
                    <tr key={cita.id} data-testid={`cita-${cita.id}`}>
                      <td className="cell-primary">
                        {cita.paciente.nombre} {cita.paciente.apellido}
                      </td>
                      <td>{cita.odontologo.nombre}</td>
                      <td>{cita.servicio.nombre}</td>
                      <td>
                        {formatearFecha(cita.horaInicio)}
                        <br />
                        {formatearRangoHora(cita.horaInicio, cita.horaFin)}
                      </td>
                      <td>
                        <EstadoCitaBadge estado={cita.estado} />
                      </td>
                      <td>
                        <div className="actions">
                          {acciones.includes('confirmar') && (
                            <button
                              type="button"
                              disabled={procesando === cita.id}
                              onClick={() =>
                                void ejecutar(cita.id, () =>
                                  appointmentsApi.cambiarEstado(cita.id, 'CONFIRMADA'),
                                )
                              }
                              data-testid="btn-confirmar"
                            >
                              Confirmar
                            </button>
                          )}
                          {acciones.includes('cancelar') && (
                            <button
                              type="button"
                              className="secondary danger"
                              disabled={procesando === cita.id}
                              onClick={() => void cancelar(cita)}
                              data-testid="btn-cancelar"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="paginacion">
          <button
            type="button"
            className="secondary"
            disabled={offset === 0}
            onClick={() => setOffset((actual) => Math.max(actual - LIMITE, 0))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="secondary"
            disabled={citas.status !== 'ok' || citas.datos.length < LIMITE}
            onClick={() => setOffset((actual) => actual + LIMITE)}
          >
            Siguiente
          </button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
