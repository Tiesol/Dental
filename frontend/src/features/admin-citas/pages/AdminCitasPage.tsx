import { useCallback, useState } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { AppointmentResponse, EstadoCita } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Select, type SelectOption } from '@/shared/components/Select';
import { useCarga } from '@/shared/hooks/useCarga';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { formatearFecha, formatearRangoHora } from '@/shared/lib/dates';
import { accionesPermitidas, etiquetaEstado } from '@/shared/lib/estados-cita';

const LIMITE = 50;
const ESTADOS: EstadoCita[] = ['PENDIENTE', 'CONFIRMADA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA'];
const OPCIONES_ESTADO: SelectOption<EstadoCita | ''>[] = [
  { value: '', label: 'Todos' },
  ...ESTADOS.map((valor) => ({ value: valor, label: etiquetaEstado(valor) })),
];

type Procesando = { citaId: string; accion: 'confirmar' | 'cancelar' };

// Todas las citas (ADMIN): filtros, confirmar y cancelar. Los filtros los aplica el backend.
export function AdminCitasPage() {
  const { user } = useAuth();
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoCita | ''>('');
  const [dentistId, setDentistId] = useState('');
  const [offset, setOffset] = useState(0);
  const [procesando, setProcesando] = useState<Procesando | null>(null);
  const [errorAccion, setErrorAccion] = useState('');
  const { confirm, dialog } = useConfirm();

  const cargarCitas = useCallback(
    (signal: AbortSignal) =>
      appointmentsApi.todas(
        {
          fecha: fecha || undefined,
          estado: estado || undefined,
          dentistId: dentistId || undefined,
          limit: LIMITE,
          offset,
        },
        signal,
      ),
    [fecha, estado, dentistId, offset],
  );
  const cargarOdontologos = useCallback(() => dentistsApi.listarAdmin(), []);
  const { estado: citas, recargar, actualizar } = useCarga(cargarCitas);
  const { estado: odontologos } = useCarga(cargarOdontologos);

  const opcionesOdontologo: SelectOption<string>[] = [
    { value: '', label: 'Todos' },
    ...(odontologos.status === 'ok'
      ? odontologos.datos.map((d) => ({ value: d.id, label: d.nombre }))
      : []),
  ];

  // Solo cambia la cita afectada, con la respuesta del backend. Si falla, la cita pudo haber
  // cambiado por otro lado y se vuelve a pedir la lista para mostrar su estado real.
  const ejecutar = async (en: Procesando, accion: () => Promise<AppointmentResponse>) => {
    setErrorAccion('');
    setProcesando(en);
    try {
      const actualizada = await accion();
      actualizar((lista) => lista.map((c) => (c.id === actualizada.id ? actualizada : c)));
    } catch (err) {
      setErrorAccion((err as Error).message);
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
    if (ok) {
      await ejecutar({ citaId: cita.id, accion: 'cancelar' }, () =>
        appointmentsApi.cancelar(cita.id),
      );
    }
  };

  // Un filtro nuevo siempre empieza en la primera página.
  const alFiltrar = (cambio: () => void) => {
    cambio();
    setOffset(0);
  };

  const enCurso = (citaId: string, accion: Procesando['accion']) =>
    procesando?.citaId === citaId && procesando.accion === accion;

  return (
    <div className="page">
      <PageHeader title="Citas" description="Todas las citas de la clínica." />

      <section className="card card-flush">
        <div className="filters">
          <DateField
            label="Fecha"
            value={fecha}
            onChange={(valor) => alFiltrar(() => setFecha(valor))}
            clearable
            fieldClassName="field-filter"
          />
          <Select
            variant="filter"
            label="Estado"
            value={estado}
            options={OPCIONES_ESTADO}
            onChange={(valor) => alFiltrar(() => setEstado(valor))}
          />
          <Select
            variant="filter"
            label="Odontólogo"
            value={dentistId}
            options={opcionesOdontologo}
            onChange={(valor) => alFiltrar(() => setDentistId(valor))}
          />
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
                  const ocupada = procesando?.citaId === cita.id;
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
                            <Button
                              loading={enCurso(cita.id, 'confirmar')}
                              disabled={ocupada}
                              onClick={() =>
                                void ejecutar({ citaId: cita.id, accion: 'confirmar' }, () =>
                                  appointmentsApi.cambiarEstado(cita.id, 'CONFIRMADA'),
                                )
                              }
                              data-testid="btn-confirmar"
                            >
                              Confirmar
                            </Button>
                          )}
                          {acciones.includes('cancelar') && (
                            <Button
                              variant="danger-outline"
                              loading={enCurso(cita.id, 'cancelar')}
                              disabled={ocupada}
                              onClick={() => void cancelar(cita)}
                              data-testid="btn-cancelar"
                            >
                              Cancelar
                            </Button>
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
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() => setOffset((actual) => Math.max(actual - LIMITE, 0))}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={citas.status !== 'ok' || citas.datos.length < LIMITE}
            onClick={() => setOffset((actual) => actual + LIMITE)}
          >
            Siguiente
          </Button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
