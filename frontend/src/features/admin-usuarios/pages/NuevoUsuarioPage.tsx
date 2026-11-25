import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffRole } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { PageHeader } from '@/shared/components/PageHeader';
import { Select, type SelectOption } from '@/shared/components/Select';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, email, maxLength, minLength, required } from '@/shared/lib/validators';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { useCreateUser } from '../hooks/useCreateUser';

const ROLE_OPTIONS: SelectOption<StaffRole>[] = [
  { value: 'ODONTOLOGO', label: ROLE_LABEL.ODONTOLOGO },
  { value: 'ADMIN', label: ROLE_LABEL.ADMIN },
];

// Alta de ODONTOLOGO o ADMIN. Los pacientes se registran solos desde /registro.
export function NuevoUsuarioPage() {
  const navigate = useNavigate();
  const { create, sending, error } = useCreateUser();
  const [role, setRole] = useState<StaffRole>('ODONTOLOGO');
  const isDentist = role === 'ODONTOLOGO';
  // Nombre y especialidad solo aplican a un odontólogo.
  const form = useForm(
    { nombre: '', especialidad: '', email: '', password: '' },
    {
      nombre: (value) => (isDentist ? required('Escribe el nombre')(value) : null),
      especialidad: (value) => (isDentist ? required('Escribe la especialidad')(value) : null),
      email: combine(required('Escribe el email'), email()),
      password: combine(
        required('Escribe una contraseña inicial'),
        minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
        maxLength(72, 'La contraseña admite hasta 72 caracteres'),
      ),
    },
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    const { nombre: name, especialidad: specialty, email: emailAddress, password } = form.values;
    const created = await create(
      isDentist
        ? {
            role: 'ODONTOLOGO',
            email: emailAddress.trim(),
            password,
            nombre: name.trim(),
            especialidad: specialty.trim(),
          }
        : { role: 'ADMIN', email: emailAddress.trim(), password },
    );
    if (created) navigate('/admin/usuarios');
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Nuevo usuario"
        description={
          <>
            Los pacientes crean su propia cuenta desde el registro. Para registrar un odontólogo
            junto con los servicios que realiza, usa{' '}
            <Link to="/admin/odontologos/nuevo">Odontólogos</Link>.
          </>
        }
        back={{ to: '/admin/usuarios', label: 'Volver al listado' }}
      />
      <form className="card" onSubmit={onSubmit} noValidate>
        <Select label="Rol" value={role} options={ROLE_OPTIONS} onChange={setRole} />
        {isDentist && (
          <>
            <TextField
              {...form.field('nombre')}
              label="Nombre"
              placeholder="Dr. Juan Rojas"
              maxLength={100}
            />
            <TextField
              {...form.field('especialidad')}
              label="Especialidad"
              placeholder="Ortodoncia"
              maxLength={100}
            />
          </>
        )}
        <TextField {...form.field('email')} label="Email" type="email" autoComplete="off" />
        <TextField
          {...form.field('password')}
          label="Contraseña inicial"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres. El usuario podrá cambiarla en Mi cuenta."
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <Button type="submit" loading={sending} data-testid="btn-crear-usuario">
            Crear usuario
          </Button>
        </div>
      </form>
    </div>
  );
}
