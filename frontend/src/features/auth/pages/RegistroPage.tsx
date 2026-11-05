import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { useAuth } from '../useAuth';

type Form = { nombre: string; apellido: string; telefono: string; email: string; password: string };

export function RegistroPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (field: keyof Form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await register({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
        ...(form.telefono.trim() ? { telefono: form.telefono.trim() } : {}),
      });
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="page-header-text">
        <h1>Crear cuenta de paciente</h1>
        <p className="muted">Todos los campos son obligatorios, salvo el teléfono.</p>
      </div>
      <div className="form-row">
        <label>
          Nombre
          <input
            value={form.nombre}
            onChange={(e) => update('nombre')(e.target.value)}
            required
            autoComplete="given-name"
          />
        </label>
        <label>
          Apellido
          <input
            value={form.apellido}
            onChange={(e) => update('apellido')(e.target.value)}
            required
            autoComplete="family-name"
          />
        </label>
      </div>
      <label>
        Teléfono (opcional)
        <input
          type="tel"
          value={form.telefono}
          onChange={(e) => update('telefono')(e.target.value)}
          autoComplete="tel"
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={form.email}
          onChange={(e) => update('email')(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={form.password}
          onChange={(e) => update('password')(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <small className="muted">Mínimo 8 caracteres</small>
      </label>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button type="submit" disabled={sending} data-testid="btn-registrar">
        {sending ? 'Creando…' : 'Crear cuenta'}
      </button>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
