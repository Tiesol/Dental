import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffRole } from '@/api/types';
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
    <form className="card" onSubmit={onSubmit}>
      <h1>Nuevo usuario</h1>
      <p className="muted">Los pacientes crean su propia cuenta desde el registro.</p>
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
      {error && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {error}
        </p>
      )}
      <button type="submit" disabled={enviando} data-testid="btn-crear-usuario">
        {enviando ? 'Creando…' : 'Crear usuario'}
      </button>
      <Link to="/admin/usuarios">Volver al listado</Link>
    </form>
  );
}
