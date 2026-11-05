import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { useAuth } from '../useAuth';

export function LoginPage() {
  const { user, login, sesionExpirada } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await login(email, password);
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
        <h1>Iniciar sesión</h1>
        <p className="muted">Ingresa con el email y la contraseña de tu cuenta.</p>
      </div>
      {sesionExpirada && (
        <p className="message message-info" role="status">
          Tu sesión expiró o tu cuenta fue deshabilitada. Vuelve a iniciar sesión.
        </p>
      )}
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button type="submit" disabled={sending} data-testid="btn-login">
        {sending ? 'Ingresando…' : 'Ingresar'}
      </button>
      <p className="muted">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </form>
  );
}
