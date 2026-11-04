import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatearDuracion, formatearPrecio } from '@/shared/lib/formato';
import { useServicios } from '../hooks/useServicios';

type Filtro = 'TODOS' | 'HABILITADOS' | 'DESHABILITADOS';

// Gestión del catálogo (ADMIN): ve todos los servicios, con su estado.
export function AdminServiciosPage() {
  const { estado, cambiarEstado } = useServicios();
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
      !window.confirm(
        `¿Deshabilitar "${nombre}"? No se podrá reservar, pero las citas existentes se conservan.`,
      )
    ) {
      return;
    }
    setErrorAccion('');
    setProcesando(id);
    const error = await cambiarEstado(id, !activo);
    setProcesando(null);
    if (error) setErrorAccion(error);
  };

  return (
    <section className="card wide">
      <div className="toolbar">
        <h1>Servicios</h1>
        <Link to="/admin/servicios/nuevo" className="button" data-testid="btn-nuevo-servicio">
          Nuevo servicio
        </Link>
      </div>

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

      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {(estado.status === 'error' || errorAccion) && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.status === 'error' ? estado.mensaje : errorAccion}
        </p>
      )}
      {estado.status === 'ok' && visibles.length === 0 && (
        <p className="muted">No hay servicios que coincidan.</p>
      )}
      {visibles.length > 0 && (
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
                <td>{s.nombre}</td>
                <td>{formatearDuracion(s.duracionMin)}</td>
                <td>{formatearPrecio(s.precioReferencial)}</td>
                <td>
                  <span className={s.activo ? 'badge ok' : 'badge off'}>
                    {s.activo ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </td>
                <td className="actions">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
