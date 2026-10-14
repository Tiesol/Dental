import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Crear cuenta de paciente</h1>
      <label>
        Nombre completo
        <input
          value={form.fullName}
          onChange={(e) => update('fullName')(e.target.value)}
          required
          autoComplete="name"
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
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={sending}>
        {sending ? 'Creando…' : 'Crear cuenta'}
      </button>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
