import { useMemo, useState } from 'react';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Select, type SelectOption } from '@/shared/components/Select';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { formatDuration, formatPrice } from '@/shared/lib/format';
import { useServices } from '../hooks/useServices';

type Filter = 'TODOS' | 'HABILITADOS' | 'DESHABILITADOS';

const FILTER_OPTIONS: SelectOption<Filter>[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'HABILITADOS', label: 'Habilitados' },
  { value: 'DESHABILITADOS', label: 'Deshabilitados' },
];

// Gestión del catálogo (ADMIN): ve todos los servicios, con su estado.
export function AdminServiciosPage() {
  const { state, changeStatus } = useServices();
  const { confirm, dialog } = useConfirm();
  const [filter, setFilter] = useState<Filter>('TODOS');
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const visible = useMemo(() => {
    if (state.status !== 'ok') return [];
    return state.services.filter(
      (s) =>
        filter === 'TODOS' ||
        (filter === 'HABILITADOS' && s.activo) ||
        (filter === 'DESHABILITADOS' && !s.activo),
    );
  }, [state, filter]);

  const toggleStatus = async (id: string, name: string, active: boolean) => {
    if (
      active &&
      !(await confirm({
        title: `¿Deshabilitar "${name}"?`,
        message: 'No se podrá reservar, pero las citas existentes se conservan.',
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

  const emptyCatalog = state.status === 'ok' && state.services.length === 0;

  return (
    <div className="page">
      <PageHeader
        title="Servicios"
        description="Tratamientos que los pacientes pueden reservar."
        actions={
          <ButtonLink to="/admin/servicios/nuevo" data-testid="btn-nuevo-servicio">
            <Icon name="plus" />
            Nuevo servicio
          </ButtonLink>
        }
      />

      <section className="card card-flush">
        <div className="filters">
          <Select
            variant="filter"
            label="Estado"
            value={filter}
            options={FILTER_OPTIONS}
            onChange={setFilter}
          />
        </div>

        {state.status === 'cargando' && <LoadingState />}
        {(state.status === 'error' || actionError) && (
          <ErrorMessage>{state.status === 'error' ? state.message : actionError}</ErrorMessage>
        )}
        {emptyCatalog && (
          <EmptyState
            title="Todavía no hay servicios"
            description="Crea el primero con el botón Nuevo servicio."
          />
        )}
        {state.status === 'ok' && !emptyCatalog && visible.length === 0 && (
          <EmptyState
            title="No hay servicios que coincidan"
            description="Prueba con otro estado."
          />
        )}
        {visible.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Duración</th>
                  <th>Precio referencial</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} data-testid={`servicio-${s.id}`}>
                    <td className="cell-primary">{s.nombre}</td>
                    <td>{formatDuration(s.duracionMin)}</td>
                    <td>{formatPrice(s.precioReferencial)}</td>
                    <td>
                      <ActiveBadge active={s.activo} />
                    </td>
                    <td>
                      <div className="actions">
                        <div className="acciones-apiladas">
                          <ButtonLink variant="secondary" to={`/admin/servicios/${s.id}`}>
                            Editar
                          </ButtonLink>
                          <Button
                            variant={s.activo ? 'danger-outline' : 'secondary'}
                            loading={processing === s.id}
                            onClick={() => void toggleStatus(s.id, s.nombre, s.activo)}
                            data-testid="btn-cambiar-estado-servicio"
                          >
                            {s.activo ? 'Deshabilitar' : 'Habilitar'}
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
