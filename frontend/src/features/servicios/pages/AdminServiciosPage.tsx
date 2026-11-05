import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { formatearDuracion, formatearPrecio } from '@/shared/lib/formato';
import { useServicios } from '../hooks/useServicios';

type Filtro = 'TODOS' | 'HABILITADOS' | 'DESHABILITADOS';

// Gestión del catálogo (ADMIN): ve todos los servicios, con su estado.
export function AdminServiciosPage() {
  const { estado, cambiarEstado } = useServicios();
  const { confirm, dialog } = useConfirm();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');

  const visibles = useMemo(() => {
    if (estado.status !== 'ok') return [];
    return estado.servicios.filter(
      (s) =>
        filtro === 'TODOS' ||
        (filtro === 'HABILITADOS' && s.activo) ||
        (filtro === 'DESHABILITADOS' && !s.activo),
    );
  }, [estado, filtro]);

  const alternarEstado = async (id: string, nombre: string, activo: boolean) => {
    if (
      activo &&
      !(await confirm({
        title: `¿Deshabilitar "${nombre}"?`,
        message: 'No se podrá reservar, pero las citas existentes se conservan.',
        confirmLabel: 'Deshabilitar',
      }))
    ) {
      return;
    }
    setErrorAccion('');
    setProcesando(id);
    const error = await cambiarEstado(id, !activo);
    setProcesando(null);
    if (error) setErrorAccion(error);
  };

  const catalogoVacio = estado.status === 'ok' && estado.servicios.length === 0;

  return (
    <div className="page">
      <PageHeader
        title="Servicios"
        description="Tratamientos que los pacientes pueden reservar."
        actions={
          <Link to="/admin/servicios/nuevo" className="button" data-testid="btn-nuevo-servicio">
            <Icon name="plus" />
            Nuevo servicio
          </Link>
        }
      />

      <section className="card card-flush">
        <div className="filters">
          <label>
            Estado
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
              <option value="TODOS">Todos</option>
              <option value="HABILITADOS">Habilitados</option>
              <option value="DESHABILITADOS">Deshabilitados</option>
            </select>
          </label>
        </div>

        {estado.status === 'cargando' && <LoadingState />}
        {(estado.status === 'error' || errorAccion) && (
          <ErrorMessage>{estado.status === 'error' ? estado.mensaje : errorAccion}</ErrorMessage>
        )}
        {catalogoVacio && (
          <EmptyState
            title="Todavía no hay servicios"
            description="Crea el primero con el botón Nuevo servicio."
          />
        )}
        {estado.status === 'ok' && !catalogoVacio && visibles.length === 0 && (
          <EmptyState
            title="No hay servicios que coincidan"
            description="Prueba con otro estado."
          />
        )}
        {visibles.length > 0 && (
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
                {visibles.map((s) => (
                  <tr key={s.id} data-testid={`servicio-${s.id}`}>
                    <td className="cell-primary">{s.nombre}</td>
                    <td>{formatearDuracion(s.duracionMin)}</td>
                    <td>{formatearPrecio(s.precioReferencial)}</td>
                    <td>
                      <ActiveBadge active={s.activo} />
                    </td>
                    <td>
                      <div className="actions">
                        <Link to={`/admin/servicios/${s.id}`}>Editar</Link>
                        <button
                          type="button"
                          className={s.activo ? 'secondary danger' : 'secondary'}
                          disabled={procesando === s.id}
                          onClick={() => void alternarEstado(s.id, s.nombre, s.activo)}
                          data-testid="btn-cambiar-estado-servicio"
                        >
                          {s.activo ? 'Deshabilitar' : 'Habilitar'}
                        </button>
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
