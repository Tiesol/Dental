import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { UpdateUserRequest, UserDetail } from '@/api/types';
import { useAuth } from '@/features/auth';
import { CAMPOS_PERFIL_POR_ROL, ROLE_LABEL } from '@/shared/lib/roles';
import { useUsuario } from '../hooks/useUsuario';

export function EditarUsuarioPage() {
  const { id = '' } = useParams();
  const { estado, guardar, cambiarEstado } = useUsuario(id);

  if (estado.status === 'cargando') return <p className="muted">Cargando…</p>;
  if (estado.status === 'error') {
    return (
      <section className="card">
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
        <Link to="/admin/usuarios">Volver al listado</Link>
      </section>
    );
  }
  return (
    <FormularioUsuario
      key={estado.usuario.id}
      usuario={estado.usuario}
      guardar={guardar}
      cambiarEstado={cambiarEstado}
    />
  );
}

type Props = {
  usuario: UserDetail;
  guardar: (cambios: UpdateUserRequest) => Promise<void>;
  cambiarEstado: (activo: boolean) => Promise<void>;
};

function FormularioUsuario({ usuario, guardar, cambiarEstado }: Props) {
  const { user: yo } = useAuth();
  const campos = CAMPOS_PERFIL_POR_ROL[usuario.role];
  const [form, setForm] = useState({
    email: usuario.email,
    nombre: usuario.paciente?.nombre ?? usuario.odontologo?.nombre ?? '',
    apellido: usuario.paciente?.apellido ?? '',
    telefono: usuario.paciente?.telefono ?? '',
    especialidad: usuario.odontologo?.especialidad ?? '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const esYo = usuario.id === yo?.id;

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const ejecutar = async (accion: () => Promise<void>, mensajeExito: string) => {
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await accion();
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
    const cambios: UpdateUserRequest = { email: form.email };
    for (const campo of campos) cambios[campo] = form[campo];
    void ejecutar(() => guardar(cambios), 'Cambios guardados');
  };

  const alternarEstado = () => {
    if (usuario.activo && !window.confirm('¿Deshabilitar esta cuenta? No podrá iniciar sesión.')) {
      return;
    }
    void ejecutar(
      () => cambiarEstado(!usuario.activo),
      usuario.activo ? 'Cuenta deshabilitada' : 'Cuenta habilitada',
    );
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Editar usuario</h1>
      <dl>
        <dt>Rol</dt>
        <dd>{ROLE_LABEL[usuario.role]}</dd>
        <dt>Estado</dt>
        <dd>
          <span className={usuario.activo ? 'badge ok' : 'badge off'}>
            {usuario.activo ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </dd>
        <dt>Creado</dt>
        <dd>{new Date(usuario.createdAt).toLocaleDateString('es')}</dd>
      </dl>

      <label>
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => update('email')(e.target.value)}
          required
        />
      </label>
      {campos.includes('nombre') && (
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => update('nombre')(e.target.value)} required />
        </label>
      )}
      {campos.includes('apellido') && (
        <label>
          Apellido
          <input
            value={form.apellido}
            onChange={(e) => update('apellido')(e.target.value)}
            required
          />
        </label>
      )}
      {campos.includes('telefono') && (
        <label>
          Teléfono (opcional)
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => update('telefono')(e.target.value)}
          />
        </label>
      )}
      {campos.includes('especialidad') && (
        <label>
          Especialidad
          <input
            value={form.especialidad}
            onChange={(e) => update('especialidad')(e.target.value)}
            required
          />
        </label>
      )}

      {error && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {error}
        </p>
      )}
      {exito && (
        <p className="success" role="status">
          {exito}
        </p>
      )}

      <button type="submit" disabled={enviando} data-testid="btn-guardar-usuario">
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
      <button
        type="button"
        className={usuario.activo ? 'secondary danger' : 'secondary'}
        disabled={enviando || esYo}
        title={esYo ? 'No puedes deshabilitar tu propia cuenta' : undefined}
        onClick={alternarEstado}
        data-testid="btn-cambiar-estado"
      >
        {usuario.activo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
      </button>
      <Link to="/admin/usuarios">Volver al listado</Link>
    </form>
  );
}
