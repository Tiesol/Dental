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
import { PROFILE_FIELDS_BY_ROLE, ROLE_LABEL } from '@/shared/lib/roles';
import { combine, email, required } from '@/shared/lib/validators';
import { useUser } from '../hooks/useUser';

const BACK = { to: '/admin/usuarios', label: 'Volver al listado' };

export function EditarUsuarioPage() {
  const { id = '' } = useParams();
  const { state, save, changeStatus } = useUser(id);

  if (state.status === 'cargando') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar usuario" back={BACK} />
        <ErrorMessage>{state.message}</ErrorMessage>
      </div>
    );
  }
  return (
    <FormularioUsuario
      key={state.user.id}
      user={state.user}
      save={save}
      changeStatus={changeStatus}
    />
  );
}

type Props = {
  user: UserDetail;
  save: (changes: UpdateUserRequest) => Promise<void>;
  changeStatus: (active: boolean) => Promise<void>;
};

type Action = 'guardar' | 'estado';

function FormularioUsuario({ user, save, changeStatus }: Props) {
  const { user: me } = useAuth();
  const { confirm, dialog } = useConfirm();
  const fields = PROFILE_FIELDS_BY_ROLE[user.role];
  // Solo se validan los campos que aplican al rol del usuario.
  const ifApplicable = (field: (typeof fields)[number], message: string) => (value: string) =>
    fields.includes(field) ? required(message)(value) : null;
  const form = useForm(
    {
      email: user.email,
      nombre: user.paciente?.nombre ?? user.odontologo?.nombre ?? '',
      apellido: user.paciente?.apellido ?? '',
      telefono: user.paciente?.telefono ?? '',
      especialidad: user.odontologo?.especialidad ?? '',
    },
    {
      email: combine(required('Escribe el email'), email()),
      nombre: ifApplicable('nombre', 'Escribe el nombre'),
      apellido: ifApplicable('apellido', 'Escribe el apellido'),
      especialidad: ifApplicable('especialidad', 'Escribe la especialidad'),
    },
  );
  const [inProgress, setInProgress] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isMe = user.id === me?.id;

  const run = async (action: Action, call: () => Promise<void>, successMessage: string) => {
    setError('');
    setSuccess('');
    setInProgress(action);
    try {
      await call();
      setSuccess(successMessage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInProgress(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
    const changes: UpdateUserRequest = { email: form.values.email.trim() };
    for (const field of fields) changes[field] = form.values[field].trim();
    await run('guardar', () => save(changes), 'Cambios guardados');
  };

  const toggleStatus = async () => {
    if (
      user.activo &&
      !(await confirm({
        title: '¿Deshabilitar esta cuenta?',
        message: 'No podrá iniciar sesión hasta que vuelvas a habilitarla.',
        confirmLabel: 'Deshabilitar cuenta',
      }))
    ) {
      return;
    }
    await run(
      'estado',
      () => changeStatus(!user.activo),
      user.activo ? 'Cuenta deshabilitada' : 'Cuenta habilitada',
    );
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Editar usuario" description={user.nombre} back={BACK} />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-datos" noValidate>
        <h2 id="titulo-datos">Datos</h2>
        <dl className="details">
          <dt>Rol</dt>
          <dd>{ROLE_LABEL[user.role]}</dd>
          <dt>Creado</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString('es')}</dd>
        </dl>

        <TextField {...form.field('email')} label="Email" type="email" />
        {fields.includes('nombre') && (
          <TextField {...form.field('nombre')} label="Nombre" maxLength={100} />
        )}
        {fields.includes('apellido') && (
          <TextField {...form.field('apellido')} label="Apellido" maxLength={100} />
        )}
        {fields.includes('telefono') && (
          <TextField
            {...form.field('telefono')}
            label="Teléfono (opcional)"
            type="tel"
            maxLength={30}
          />
        )}
        {fields.includes('especialidad') && (
          <TextField {...form.field('especialidad')} label="Especialidad" maxLength={100} />
        )}

        <div className="form-actions">
          <Button
            type="submit"
            loading={inProgress === 'guardar'}
            disabled={inProgress !== null}
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
            <ActiveBadge active={user.activo} />
          </div>
          <p className="muted">
            {isMe
              ? 'No puedes deshabilitar tu propia cuenta.'
              : 'Una cuenta deshabilitada no puede iniciar sesión.'}
          </p>
        </div>
        <div className="form-actions">
          <Button
            variant={user.activo ? 'danger-outline' : 'secondary'}
            loading={inProgress === 'estado'}
            disabled={inProgress !== null || isMe}
            onClick={() => void toggleStatus()}
            data-testid="btn-cambiar-estado"
          >
            {user.activo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
          </Button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
