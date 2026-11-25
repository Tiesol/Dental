import { useState } from 'react';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useAdminDentists } from '../hooks/useAdminDentists';

// Gestión de odontólogos (ADMIN): todos, con su estado profesional y el de su cuenta.
export function AdminOdontologosPage() {
  const { state, changeStatus } = useAdminDentists();
  const { confirm, dialog } = useConfirm();
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const toggleStatus = async (id: string, name: string, active: boolean) => {
    if (
      active &&
      !(await confirm({
        title: `¿Deshabilitar a ${name}?`,
        message: 'No recibirá nuevas citas; sus citas existentes se conservan.',
        confirmLabel: 'Deshabilitar',
      }))
    ) {
      return;
    }
    setActionError('');
    setProcessing(id);
    const error = await changeStatus(id, !active);
    setProcessing(null);
    if (error) setActionError(error);
  };

  return (
    <div className="page">
      <PageHeader
        title="Odontólogos"
        description="Profesionales de la clínica y los servicios que realizan."
        actions={
          <ButtonLink to="/admin/odontologos/nuevo" data-testid="btn-nuevo-odontologo">
            <Icon name="plus" />
            Nuevo odontólogo
          </ButtonLink>
        }
      />

      <section className="card card-flush">
        {state.status === 'cargando' && <LoadingState />}
        {(state.status === 'error' || actionError) && (
          <ErrorMessage>{state.status === 'error' ? state.message : actionError}</ErrorMessage>
        )}
        {state.status === 'ok' && state.dentists.length === 0 && (
          <EmptyState
            title="Todavía no hay odontólogos registrados"
            description="Registra el primero con el botón Nuevo odontólogo."
          />
        )}
        {state.status === 'ok' && state.dentists.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Odontólogo</th>
                  <th>Especialidad</th>
                  <th>Servicios</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.dentists.map((d) => (
                  <tr key={d.id} data-testid={`odontologo-${d.id}`}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={d.nombre} />
                        <div>
                          <span className="cell-primary">{d.nombre}</span>
                          <small>{d.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{d.especialidad}</td>
                    <td className="celda-larga">
                      {d.servicios.length === 0 ? (
                        <span className="muted">Sin servicios</span>
                      ) : (
                        d.servicios.map((s) => s.nombre).join(', ')
                      )}
                    </td>
                    <td>
                      <ActiveBadge active={d.activo} activeLabel="Acepta citas" />
                      {!d.cuentaActiva && (
                        <small className="text-error">Cuenta deshabilitada</small>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <div className="acciones-apiladas">
                          <ButtonLink
                            variant="secondary"
                            to={`/admin/odontologos/${d.id}/horarios`}
                          >
                            <span className="btn-label">
                              <Icon name="clock" />
                              Horarios
                            </span>
                          </ButtonLink>
                          <ButtonLink variant="secondary" to={`/admin/odontologos/${d.id}`}>
                            Editar
                          </ButtonLink>
                          <Button
                            variant={d.activo ? 'danger-outline' : 'secondary'}
                            loading={processing === d.id}
                            onClick={() => void toggleStatus(d.id, d.nombre, d.activo)}
                            data-testid="btn-cambiar-estado-odontologo"
                          >
                            {d.activo ? 'Deshabilitar' : 'Habilitar'}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dialog}
    </div>
  );
}
