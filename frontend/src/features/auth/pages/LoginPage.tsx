import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, email, required } from '@/shared/lib/validators';
import { useAuth } from '../useAuth';

export function LoginPage() {
  const { user, login, sesionExpirada } = useAuth();
  const navigate = useNavigate();
  const form = useForm(
    { email: '', password: '' },
    {
      email: combine(required('Escribe tu email'), email()),
      password: required('Escribe tu contraseña'),
    },
  );
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    setSending(true);
    try {
      await login(form.values.email.trim(), form.values.password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="page-header-text">
        <h1>Iniciar sesión</h1>
        <p className="muted">Ingresa con el email y la contraseña de tu cuenta.</p>
      </div>
      {sesionExpirada && (
        <p className="message message-info" role="status">
          Tu sesión expiró o tu cuenta fue deshabilitada. Vuelve a iniciar sesión.
        </p>
      )}
      <TextField {...form.field('email')} label="Email" type="email" autoComplete="email" />
      <TextField
        {...form.field('password')}
        label="Contraseña"
        type="password"
        autoComplete="current-password"
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button type="submit" loading={sending} data-testid="btn-login">
        Ingresar
      </Button>
      <p className="muted">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </form>
  );
}
