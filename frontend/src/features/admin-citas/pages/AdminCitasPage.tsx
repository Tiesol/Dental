import { useCallback, useState } from 'react';
import { appointmentsApi } from '@/api/endpoints/appointments';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { AppointmentResponse, AppointmentStatus } from '@/api/types';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EstadoCitaBadge } from '@/shared/components/EstadoCitaBadge';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Select, type SelectOption } from '@/shared/components/Select';
import { useLoader } from '@/shared/hooks/useLoader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { formatDate, formatTimeRange } from '@/shared/lib/dates';
import { allowedActions, statusLabel } from '@/shared/lib/appointment-status';

const LIMIT = 50;
const STATUSES: AppointmentStatus[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'EN_ATENCION',
  'FINALIZADA',
  'CANCELADA',
];
const STATUS_OPTIONS: SelectOption<AppointmentStatus | ''>[] = [
  { value: '', label: 'Todos' },
  ...STATUSES.map((value) => ({ value, label: statusLabel(value) })),
];

type Processing = { appointmentId: string; action: 'confirmar' | 'cancelar' };

// Todas las citas (ADMIN): filtros, confirmar y cancelar. Los filtros los aplica el backend.
export function AdminCitasPage() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [dentistId, setDentistId] = useState('');
  const [offset, setOffset] = useState(0);
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [actionError, setActionError] = useState('');
  const { confirm, dialog } = useConfirm();

  const loadAppointments = useCallback(
    (signal: AbortSignal) =>
      appointmentsApi.all(
        {
          fecha: date || undefined,
          estado: status || undefined,
          dentistId: dentistId || undefined,
          limit: LIMIT,
          offset,
        },
        signal,
      ),
    [date, status, dentistId, offset],
  );
  const loadDentists = useCallback(() => dentistsApi.listAdmin(), []);
  const { state: appointments, reload, update } = useLoader(loadAppointments);
  const { state: dentists } = useLoader(loadDentists);

  const dentistOptions: SelectOption<string>[] = [
    { value: '', label: 'Todos' },
    ...(dentists.status === 'ok'
      ? dentists.data.map((d) => ({ value: d.id, label: d.nombre }))
      : []),
  ];

  // Solo cambia la cita afectada, con la respuesta del backend. Si falla, la cita pudo haber
  // cambiado por otro lado y se vuelve a pedir la lista para mostrar su estado real.
  const run = async (targetId: Processing, action: () => Promise<AppointmentResponse>) => {
    setActionError('');
    setProcessing(targetId);
    try {
      const updated = await action();
      update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setActionError((err as Error).message);
      reload();
    } finally {
      setProcessing(null);
    }
  };

  const cancel = async (appointment: AppointmentResponse) => {
    const ok = await confirm({
      title: '¿Cancelar esta cita?',
      message: `${appointment.paciente.nombre} ${appointment.paciente.apellido} perderá su horario, que quedará disponible.`,
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
    });
    if (ok) {
      await run({ appointmentId: appointment.id, action: 'cancelar' }, () =>
        appointmentsApi.cancel(appointment.id),
      );
    }
  };

  // Un filtro nuevo siempre empieza en la primera página.
  const onFilter = (change: () => void) => {
    change();
    setOffset(0);
  };

  const inProgress = (appointmentId: string, action: Processing['action']) =>
    processing?.appointmentId === appointmentId && processing.action === action;

  return (
    <div className="page">
      <PageHeader title="Citas" description="Todas las citas de la clínica." />

      <section className="card card-flush">
        <div className="filters">
          <DateField
            label="Fecha"
            value={date}
            onChange={(value) => onFilter(() => setDate(value))}
            clearable
            fieldClassName="field-filter"
          />
          <Select
            variant="filter"
            label="Estado"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => onFilter(() => setStatus(value))}
          />
          <Select
            variant="filter"
            label="Odontólogo"
            value={dentistId}
            options={dentistOptions}
            onChange={(value) => onFilter(() => setDentistId(value))}
          />
        </div>

        {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
        {appointments.status === 'cargando' && <LoadingState />}
        {appointments.status === 'error' && <ErrorMessage>{appointments.message}</ErrorMessage>}
        {appointments.status === 'ok' && appointments.data.length === 0 && (
          <EmptyState title="No hay citas con estos filtros" />
        )}
        {appointments.status === 'ok' && appointments.data.length > 0 && (
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
                {appointments.data.map((appointment) => {
                  const actions = user ? allowedActions(appointment.estado, user.role) : [];
                  const busy = processing?.appointmentId === appointment.id;
                  return (
                    <tr key={appointment.id} data-testid={`cita-${appointment.id}`}>
                      <td className="cell-primary">
                        {appointment.paciente.nombre} {appointment.paciente.apellido}
                      </td>
                      <td>{appointment.odontologo.nombre}</td>
                      <td>{appointment.servicio.nombre}</td>
                      <td>
                        {formatDate(appointment.horaInicio)}
                        <br />
                        {formatTimeRange(appointment.horaInicio, appointment.horaFin)}
                      </td>
                      <td>
                        <EstadoCitaBadge status={appointment.estado} />
                      </td>
                      <td>
                        <div className="actions">
                          {actions.includes('confirmar') && (
                            <Button
                              loading={inProgress(appointment.id, 'confirmar')}
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  { appointmentId: appointment.id, action: 'confirmar' },
                                  () => appointmentsApi.changeStatus(appointment.id, 'CONFIRMADA'),
                                )
                              }
                              data-testid="btn-confirmar"
                            >
                              Confirmar
                            </Button>
                          )}
                          {actions.includes('cancelar') && (
                            <Button
                              variant="danger-outline"
                              loading={inProgress(appointment.id, 'cancelar')}
                              disabled={busy}
                              onClick={() => void cancel(appointment)}
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
            onClick={() => setOffset((current) => Math.max(current - LIMIT, 0))}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={appointments.status !== 'ok' || appointments.data.length < LIMIT}
            onClick={() => setOffset((current) => current + LIMIT)}
          >
            Siguiente
          </Button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
