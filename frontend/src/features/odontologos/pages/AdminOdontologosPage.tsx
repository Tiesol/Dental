import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useOdontologosAdmin } from '../hooks/useOdontologosAdmin';

// Gestión de odontólogos (ADMIN): todos, con su estado profesional y el de su cuenta.
export function AdminOdontologosPage() {
  const { estado, cambiarEstado } = useOdontologosAdmin();
  const { confirm, dialog } = useConfirm();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');

  const alternarEstado = async (id: string, nombre: string, activo: boolean) => {
    if (
      activo &&
      !(await confirm({
        title: `¿Deshabilitar a ${nombre}?`,
        message: 'No recibirá nuevas citas; sus citas existentes se conservan.',
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
        {estado.status === 'cargando' && <LoadingState />}
        {(estado.status === 'error' || errorAccion) && (
          <ErrorMessage>{estado.status === 'error' ? estado.mensaje : errorAccion}</ErrorMessage>
        )}
        {estado.status === 'ok' && estado.odontologos.length === 0 && (
          <EmptyState
            title="Todavía no hay odontólogos registrados"
            description="Registra el primero con el botón Nuevo odontólogo."
          />
        )}
        {estado.status === 'ok' && estado.odontologos.length > 0 && (
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
                {estado.odontologos.map((d) => (
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
                    <td>
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
                        <Link to={`/admin/odontologos/${d.id}`}>Editar</Link>
                        <Link to={`/admin/odontologos/${d.id}/horarios`}>Horarios</Link>
                        <Button
                          variant={d.activo ? 'danger-outline' : 'secondary'}
                          loading={procesando === d.id}
                          onClick={() => void alternarEstado(d.id, d.nombre, d.activo)}
                          data-testid="btn-cambiar-estado-odontologo"
                        >
                          {d.activo ? 'Deshabilitar' : 'Habilitar'}
                        </Button>
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
