import { useMemo, useState } from 'react';
import type { Role } from '@/api/types';
import { useAuth } from '@/features/auth';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Select, type SelectOption } from '@/shared/components/Select';
import { TextField } from '@/shared/components/TextField';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { useUsers } from '../hooks/useUsers';

type RoleFilter = Role | 'TODOS';

const ROLE_OPTIONS: SelectOption<RoleFilter>[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PACIENTE', label: ROLE_LABEL.PACIENTE },
  { value: 'ODONTOLOGO', label: ROLE_LABEL.ODONTOLOGO },
  { value: 'ADMIN', label: ROLE_LABEL.ADMIN },
];

export function UsuariosPage() {
  const { user: me } = useAuth();
  const { state, changeStatus } = useUsers();
  const { confirm, dialog } = useConfirm();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('TODOS');
  const [query, setQuery] = useState('');
  const appliedQuery = useDebouncedValue(query);
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const visible = useMemo(() => {
    if (state.status !== 'ok') return [];
    const text = appliedQuery.trim().toLowerCase();
    return state.users.filter(
      (u) =>
        (roleFilter === 'TODOS' || u.role === roleFilter) &&
        (!text || u.nombre.toLowerCase().includes(text) || u.email.toLowerCase().includes(text)),
    );
  }, [state, roleFilter, appliedQuery]);

  const toggleStatus = async (id: string, name: string, active: boolean) => {
    if (
      active &&
      !(await confirm({
        title: `¿Deshabilitar a ${name}?`,
        message: 'No podrá iniciar sesión hasta que vuelvas a habilitar su cuenta.',
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
        title="Usuarios"
        description="Cuentas de pacientes, odontólogos y administradores."
        actions={
          <ButtonLink to="/admin/usuarios/nuevo" data-testid="btn-nuevo-usuario">
            <Icon name="plus" />
            Nuevo usuario
          </ButtonLink>
        }
      />

      <section className="card card-flush">
        <div className="filters">
          <Select
            variant="filter"
            label="Rol"
            value={roleFilter}
            options={ROLE_OPTIONS}
            onChange={setRoleFilter}
          />
          <TextField
            label="Buscar"
            type="search"
            placeholder="Nombre o email"
            value={query}
            onChange={setQuery}
            fieldClassName="field-filter filters-grow"
          />
          {state.status === 'ok' && (
            <p className="muted filters-count" role="status">
              Mostrando {visible.length} de {state.users.length}{' '}
              {state.users.length === 1 ? 'usuario' : 'usuarios'}
            </p>
          )}
        </div>

        {state.status === 'cargando' && <LoadingState />}
        {(state.status === 'error' || actionError) && (
          <ErrorMessage>{state.status === 'error' ? state.message : actionError}</ErrorMessage>
        )}
        {state.status === 'ok' && visible.length === 0 && (
          <EmptyState
            title="No hay usuarios que coincidan"
            description="Prueba con otro rol o con otra búsqueda."
          />
        )}
        {visible.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} data-testid={`usuario-${u.id}`}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={u.nombre} />
                          <div>
                            <span className="cell-primary">{u.nombre}</span>
                            <small>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{ROLE_LABEL[u.role]}</td>
                      <td>
                        <ActiveBadge active={u.activo} />
                      </td>
                      <td>
                        <div className="actions">
                          <div className="acciones-apiladas">
                            <ButtonLink variant="secondary" to={`/admin/usuarios/${u.id}`}>
                              Editar
                            </ButtonLink>
                            <Button
                              variant={u.activo ? 'danger-outline' : 'secondary'}
                              loading={processing === u.id}
                              disabled={isMe}
                              title={isMe ? 'No puedes deshabilitar tu propia cuenta' : undefined}
                              onClick={() => void toggleStatus(u.id, u.nombre, u.activo)}
                              data-testid="btn-cambiar-estado"
                            >
                              {u.activo ? 'Deshabilitar' : 'Habilitar'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dialog}
    </div>
  );
}
