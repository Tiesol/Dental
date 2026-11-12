import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { UpdateUserRequest, UserDetail } from '@/api/types';
import { useAuth } from '@/features/auth';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextField } from '@/shared/components/TextField';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useForm } from '@/shared/hooks/useForm';
import { CAMPOS_PERFIL_POR_ROL, ROLE_LABEL } from '@/shared/lib/roles';
import { combine, email, required } from '@/shared/lib/validators';
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

type Accion = 'guardar' | 'estado';

function FormularioUsuario({ usuario, guardar, cambiarEstado }: Props) {
  const { user: yo } = useAuth();
  const { confirm, dialog } = useConfirm();
  const campos = CAMPOS_PERFIL_POR_ROL[usuario.role];
  // Solo se validan los campos que aplican al rol del usuario.
  const siAplica = (campo: (typeof campos)[number], mensaje: string) => (valor: string) =>
    campos.includes(campo) ? required(mensaje)(valor) : null;
  const form = useForm(
    {
      email: usuario.email,
      nombre: usuario.paciente?.nombre ?? usuario.odontologo?.nombre ?? '',
      apellido: usuario.paciente?.apellido ?? '',
      telefono: usuario.paciente?.telefono ?? '',
      especialidad: usuario.odontologo?.especialidad ?? '',
    },
    {
      email: combine(required('Escribe el email'), email()),
      nombre: siAplica('nombre', 'Escribe el nombre'),
      apellido: siAplica('apellido', 'Escribe el apellido'),
      especialidad: siAplica('especialidad', 'Escribe la especialidad'),
    },
  );
  const [enCurso, setEnCurso] = useState<Accion | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const esYo = usuario.id === yo?.id;

  const ejecutar = async (accion: Accion, llamada: () => Promise<void>, mensajeExito: string) => {
    setError('');
    setExito('');
    setEnCurso(accion);
    try {
      await llamada();
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnCurso(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
    const cambios: UpdateUserRequest = { email: form.values.email.trim() };
    for (const campo of campos) cambios[campo] = form.values[campo].trim();
    await ejecutar('guardar', () => guardar(cambios), 'Cambios guardados');
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
    await ejecutar(
      'estado',
      () => cambiarEstado(!usuario.activo),
      usuario.activo ? 'Cuenta deshabilitada' : 'Cuenta habilitada',
    );
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Editar usuario" description={usuario.nombre} back={VOLVER} />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}

      <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-datos" noValidate>
        <h2 id="titulo-datos">Datos</h2>
        <dl className="details">
          <dt>Rol</dt>
          <dd>{ROLE_LABEL[usuario.role]}</dd>
          <dt>Creado</dt>
          <dd>{new Date(usuario.createdAt).toLocaleDateString('es')}</dd>
        </dl>

        <TextField {...form.field('email')} label="Email" type="email" />
        {campos.includes('nombre') && (
          <TextField {...form.field('nombre')} label="Nombre" maxLength={100} />
        )}
        {campos.includes('apellido') && (
          <TextField {...form.field('apellido')} label="Apellido" maxLength={100} />
        )}
        {campos.includes('telefono') && (
          <TextField
            {...form.field('telefono')}
            label="Teléfono (opcional)"
            type="tel"
            maxLength={30}
          />
        )}
        {campos.includes('especialidad') && (
          <TextField {...form.field('especialidad')} label="Especialidad" maxLength={100} />
        )}

        <div className="form-actions">
          <Button
            type="submit"
            loading={enCurso === 'guardar'}
            disabled={enCurso !== null}
            data-testid="btn-guardar-usuario"
          >
            Guardar cambios
          </Button>
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
          <Button
            variant={usuario.activo ? 'danger-outline' : 'secondary'}
            loading={enCurso === 'estado'}
            disabled={enCurso !== null || esYo}
            onClick={() => void alternarEstado()}
            data-testid="btn-cambiar-estado"
          >
            {usuario.activo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
          </Button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
