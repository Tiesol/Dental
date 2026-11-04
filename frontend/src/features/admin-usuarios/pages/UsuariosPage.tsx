import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/features/auth';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { useUsuarios } from '../hooks/useUsuarios';

type FiltroRol = Role | 'TODOS';

export function UsuariosPage() {
  const { user: yo } = useAuth();
  const { estado, cambiarEstado } = useUsuarios();
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');

  const visibles = useMemo(() => {
    if (estado.status !== 'ok') return [];
    const texto = busqueda.trim().toLowerCase();
    return estado.usuarios.filter(
      (u) =>
        (filtroRol === 'TODOS' || u.role === filtroRol) &&
        (!texto || u.nombre.toLowerCase().includes(texto) || u.email.includes(texto)),
    );
  }, [estado, filtroRol, busqueda]);

  const alternarEstado = async (id: string, nombre: string, activo: boolean) => {
    if (activo && !window.confirm(`¿Deshabilitar a ${nombre}? No podrá iniciar sesión.`)) return;
    setErrorAccion('');
    setProcesando(id);
    const error = await cambiarEstado(id, !activo);
    setProcesando(null);
    if (error) setErrorAccion(error);
  };

  return (
    <section className="card wide">
      <div className="toolbar">
        <h1>Usuarios</h1>
        <Link to="/admin/usuarios/nuevo" className="button" data-testid="btn-nuevo-usuario">
          Nuevo usuario
        </Link>
      </div>

      <div className="filters">
        <label>
          Rol
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value as FiltroRol)}>
            <option value="TODOS">Todos</option>
            <option value="PACIENTE">{ROLE_LABEL.PACIENTE}</option>
            <option value="ODONTOLOGO">{ROLE_LABEL.ODONTOLOGO}</option>
            <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
          </select>
        </label>
        <label>
          Buscar
          <input
            type="search"
            placeholder="Nombre o email"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
      </div>

      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {(estado.status === 'error' || errorAccion) && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.status === 'error' ? estado.mensaje : errorAccion}
        </p>
      )}
      {estado.status === 'ok' && visibles.length === 0 && (
        <p className="muted">No hay usuarios que coincidan.</p>
      )}
      {visibles.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => {
              const esYo = u.id === yo?.id;
              return (
                <tr key={u.id} data-testid={`usuario-${u.id}`}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <span className={u.activo ? 'badge ok' : 'badge off'}>
                      {u.activo ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </td>
                  <td className="actions">
                    <Link to={`/admin/usuarios/${u.id}`}>Editar</Link>
                    <button
                      type="button"
                      className={u.activo ? 'secondary danger' : 'secondary'}
                      disabled={esYo || procesando === u.id}
                      title={esYo ? 'No puedes deshabilitar tu propia cuenta' : undefined}
                      onClick={() => void alternarEstado(u.id, u.nombre, u.activo)}
                      data-testid="btn-cambiar-estado"
                    >
                      {u.activo ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
