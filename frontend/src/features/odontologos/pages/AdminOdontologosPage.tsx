import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOdontologosAdmin } from '../hooks/useOdontologosAdmin';

// Gestión de odontólogos (ADMIN): todos, con su estado profesional y el de su cuenta.
export function AdminOdontologosPage() {
  const { estado, cambiarEstado } = useOdontologosAdmin();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');

  const alternarEstado = async (id: string, nombre: string, activo: boolean) => {
    if (
      activo &&
      !window.confirm(
        `¿Deshabilitar a ${nombre}? No recibirá nuevas citas; sus citas existentes se conservan.`,
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
        <h1>Odontólogos</h1>
        <Link to="/admin/odontologos/nuevo" className="button" data-testid="btn-nuevo-odontologo">
          Nuevo odontólogo
        </Link>
      </div>

      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {(estado.status === 'error' || errorAccion) && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.status === 'error' ? estado.mensaje : errorAccion}
        </p>
      )}
      {estado.status === 'ok' && estado.odontologos.length === 0 && (
        <p className="muted">Todavía no hay odontólogos registrados.</p>
      )}
      {estado.status === 'ok' && estado.odontologos.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
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
                  {d.nombre}
                  <br />
                  <small className="muted">{d.email}</small>
                </td>
                <td>{d.especialidad}</td>
                <td>
                  {d.servicios.length === 0 ? (
                    <span className="muted">Ninguno</span>
                  ) : (
                    d.servicios.map((s) => s.nombre).join(', ')
                  )}
                </td>
                <td>
                  <span className={d.activo ? 'badge ok' : 'badge off'}>
                    {d.activo ? 'Acepta citas' : 'Deshabilitado'}
                  </span>
                  {!d.cuentaActiva && (
                    <>
                      <br />
                      <small className="error">Cuenta deshabilitada</small>
                    </>
                  )}
                </td>
                <td className="actions">
                  <Link to={`/admin/odontologos/${d.id}`}>Editar</Link>
                  <button
                    type="button"
                    className={d.activo ? 'secondary danger' : 'secondary'}
                    disabled={procesando === d.id}
                    onClick={() => void alternarEstado(d.id, d.nombre, d.activo)}
                    data-testid="btn-cambiar-estado-odontologo"
                  >
                    {d.activo ? 'Deshabilitar' : 'Habilitar'}
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
