import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffRole } from '@/api/types';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { PageHeader } from '@/shared/components/PageHeader';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { useCrearUsuario } from '../hooks/useCrearUsuario';

type Form = {
  role: StaffRole;
  email: string;
  password: string;
  nombre: string;
  especialidad: string;
};

// Alta de ODONTOLOGO o ADMIN. Los pacientes se registran solos desde /registro.
export function NuevoUsuarioPage() {
  const navigate = useNavigate();
  const { crear, enviando, error } = useCrearUsuario();
  const [form, setForm] = useState<Form>({
    role: 'ODONTOLOGO',
    email: '',
    password: '',
    nombre: '',
    especialidad: '',
  });

  const update = (field: keyof Form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const creado = await crear(
      form.role === 'ODONTOLOGO'
        ? {
            role: 'ODONTOLOGO',
            email: form.email,
            password: form.password,
            nombre: form.nombre,
            especialidad: form.especialidad,
          }
        : { role: 'ADMIN', email: form.email, password: form.password },
    );
    if (creado) navigate('/admin/usuarios');
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
      <form className="card" onSubmit={onSubmit}>
        <label>
          Rol
          <select value={form.role} onChange={(e) => update('role')(e.target.value)}>
            <option value="ODONTOLOGO">{ROLE_LABEL.ODONTOLOGO}</option>
            <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
          </select>
        </label>
        {form.role === 'ODONTOLOGO' && (
          <>
            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => update('nombre')(e.target.value)}
                required
                placeholder="Dr. Juan Rojas"
              />
            </label>
            <label>
              Especialidad
              <input
                value={form.especialidad}
                onChange={(e) => update('especialidad')(e.target.value)}
                required
                placeholder="Ortodoncia"
              />
            </label>
          </>
        )}
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label>
          Contraseña inicial
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password')(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <small className="muted">
            Mínimo 8 caracteres. El usuario podrá cambiarla en Mi cuenta.
          </small>
        </label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <button type="submit" disabled={enviando} data-testid="btn-crear-usuario">
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}
