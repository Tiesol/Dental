import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, email, maxLength, minLength, required } from '@/shared/lib/validators';
import { useAuth } from '../useAuth';

export function RegistroPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const form = useForm(
    { nombre: '', apellido: '', telefono: '', email: '', password: '' },
    {
      nombre: required('Escribe tu nombre'),
      apellido: required('Escribe tu apellido'),
      email: combine(required('Escribe tu email'), email()),
      password: combine(
        required('Escribe una contraseña'),
        minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
        maxLength(72, 'La contraseña admite hasta 72 caracteres'),
      ),
    },
  );
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    const { nombre, apellido, telefono, email: correo, password } = form.values;
    setSending(true);
    try {
      await register({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: correo.trim(),
        password,
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      });
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
        <h1>Crear cuenta de paciente</h1>
        <p className="muted">Todos los campos son obligatorios, salvo el teléfono.</p>
      </div>
      <div className="form-row">
        <TextField
          {...form.field('nombre')}
          label="Nombre"
          autoComplete="given-name"
          maxLength={100}
        />
        <TextField
          {...form.field('apellido')}
          label="Apellido"
          autoComplete="family-name"
          maxLength={100}
        />
      </div>
      <TextField
        {...form.field('telefono')}
        label="Teléfono (opcional)"
        type="tel"
        autoComplete="tel"
        maxLength={30}
      />
      <TextField {...form.field('email')} label="Email" type="email" autoComplete="email" />
      <TextField
        {...form.field('password')}
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres"
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button type="submit" loading={sending} data-testid="btn-registrar">
        Crear cuenta
      </Button>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
