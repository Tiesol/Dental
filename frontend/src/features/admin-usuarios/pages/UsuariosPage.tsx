import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Role } from '@/api/types';
import { useAuth } from '@/features/auth';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Avatar } from '@/shared/components/Avatar';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { useUsuarios } from '../hooks/useUsuarios';

type FiltroRol = Role | 'TODOS';

export function UsuariosPage() {
  const { user: yo } = useAuth();
  const { estado, cambiarEstado } = useUsuarios();
  const { confirm, dialog } = useConfirm();
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
    if (
      activo &&
      !(await confirm({
        title: `¿Deshabilitar a ${nombre}?`,
        message: 'No podrá iniciar sesión hasta que vuelvas a habilitar su cuenta.',
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

  return (
    <div className="page">
      <PageHeader
        title="Usuarios"
        description="Cuentas de pacientes, odontólogos y administradores."
        actions={
          <Link to="/admin/usuarios/nuevo" className="button" data-testid="btn-nuevo-usuario">
            <Icon name="plus" />
            Nuevo usuario
          </Link>
        }
      />

      <section className="card card-flush">
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
          <label className="filters-grow">
            Buscar
            <input
              type="search"
              placeholder="Nombre o email"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          {estado.status === 'ok' && (
            <p className="muted filters-count" role="status">
              Mostrando {visibles.length} de {estado.usuarios.length}{' '}
              {estado.usuarios.length === 1 ? 'usuario' : 'usuarios'}
            </p>
          )}
        </div>

        {estado.status === 'cargando' && <LoadingState />}
        {(estado.status === 'error' || errorAccion) && (
          <ErrorMessage>{estado.status === 'error' ? estado.mensaje : errorAccion}</ErrorMessage>
        )}
        {estado.status === 'ok' && visibles.length === 0 && (
          <EmptyState
            title="No hay usuarios que coincidan"
            description="Prueba con otro rol o con otra búsqueda."
          />
        )}
        {visibles.length > 0 && (
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
                {visibles.map((u) => {
                  const esYo = u.id === yo?.id;
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
