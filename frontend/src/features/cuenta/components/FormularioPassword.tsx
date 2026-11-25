import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, maxLength, minLength, required } from '@/shared/lib/validators';
import { useChangePassword } from '../hooks/useChangePassword';

const EMPTY = { passwordActual: '', passwordNueva: '', confirmacion: '' };

export function FormularioPassword() {
  const changePassword = useChangePassword();
  const form = useForm(EMPTY, {
    passwordActual: required('Escribe tu contraseña actual'),
    passwordNueva: combine(
      required('Escribe la nueva contraseña'),
      minLength(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
      maxLength(72, 'La contraseña admite hasta 72 caracteres'),
    ),
    confirmacion: (value, values) =>
      required('Repite la nueva contraseña')(value) ??
      (value !== values.passwordNueva
        ? 'La confirmación no coincide con la nueva contraseña'
        : null),
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.validate()) return;
    setSending(true);
    try {
      await changePassword({
        passwordActual: form.values.passwordActual,
        passwordNueva: form.values.passwordNueva,
      });
      form.reset();
      setSuccess('Contraseña actualizada');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-password" noValidate>
      <h2 id="titulo-password">Contraseña</h2>
      <TextField
        {...form.field('passwordActual')}
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
      />
      <TextField
        {...form.field('passwordNueva')}
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres"
      />
      <TextField
        {...form.field('confirmacion')}
        label="Confirmar nueva contraseña"
        type="password"
        autoComplete="new-password"
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={sending} data-testid="btn-cambiar-password">
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
