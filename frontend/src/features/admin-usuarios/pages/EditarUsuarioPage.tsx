import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { UpdateUserRequest, UserDetail } from '@/api/types';
import { useAuth } from '@/features/auth';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { CAMPOS_PERFIL_POR_ROL, ROLE_LABEL } from '@/shared/lib/roles';
import { useUsuario } from '../hooks/useUsuario';

const VOLVER = { to: '/admin/usuarios', label: 'Volver al listado' };

export function EditarUsuarioPage() {
  const { id = '' } = useParams();
  const { estado, guardar, cambiarEstado } = useUsuario(id);

  if (estado.status === 'cargando') return <LoadingState />;
  if (estado.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar usuario" back={VOLVER} />
        <ErrorMessage>{estado.mensaje}</ErrorMessage>
      </div>
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
  const { confirm, dialog } = useConfirm();
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

  const alternarEstado = async () => {
    if (
      usuario.activo &&
      !(await confirm({
        title: '¿Deshabilitar esta cuenta?',
        message: 'No podrá iniciar sesión hasta que vuelvas a habilitarla.',
        confirmLabel: 'Deshabilitar cuenta',
      }))
    ) {
      return;
    }
    void ejecutar(
      () => cambiarEstado(!usuario.activo),
      usuario.activo ? 'Cuenta deshabilitada' : 'Cuenta habilitada',
    );
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Editar usuario" description={usuario.nombre} back={VOLVER} />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}

      <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos</h2>
        <dl className="details">
          <dt>Rol</dt>
          <dd>{ROLE_LABEL[usuario.role]}</dd>
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
            <input
              value={form.nombre}
              onChange={(e) => update('nombre')(e.target.value)}
              required
            />
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

        <div className="form-actions">
          <button type="submit" disabled={enviando} data-testid="btn-guardar-usuario">
            {enviando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <section className="card" aria-labelledby="titulo-estado">
        <div className="card-section">
          <h2 id="titulo-estado">Estado de la cuenta</h2>
          <div>
            <ActiveBadge active={usuario.activo} />
          </div>
          <p className="muted">
            {esYo
              ? 'No puedes deshabilitar tu propia cuenta.'
              : 'Una cuenta deshabilitada no puede iniciar sesión.'}
          </p>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className={usuario.activo ? 'secondary danger' : 'secondary'}
            disabled={enviando || esYo}
            onClick={() => void alternarEstado()}
            data-testid="btn-cambiar-estado"
          >
            {usuario.activo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
          </button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
