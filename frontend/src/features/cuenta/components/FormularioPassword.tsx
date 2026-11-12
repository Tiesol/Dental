import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, maxLength, minLength, required } from '@/shared/lib/validators';
import { useCambiarPassword } from '../hooks/useCambiarPassword';

const VACIO = { passwordActual: '', passwordNueva: '', confirmacion: '' };

export function FormularioPassword() {
  const cambiarPassword = useCambiarPassword();
  const form = useForm(VACIO, {
    passwordActual: required('Escribe tu contraseña actual'),
    passwordNueva: combine(
      required('Escribe la nueva contraseña'),
      minLength(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
      maxLength(72, 'La contraseña admite hasta 72 caracteres'),
    ),
    confirmacion: (valor, valores) =>
      required('Repite la nueva contraseña')(valor) ??
      (valor !== valores.passwordNueva
        ? 'La confirmación no coincide con la nueva contraseña'
        : null),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    if (!form.validate()) return;
    setEnviando(true);
    try {
      await cambiarPassword({
        passwordActual: form.values.passwordActual,
        passwordNueva: form.values.passwordNueva,
      });
      form.reset();
      setExito('Contraseña actualizada');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-password" noValidate>
      <h2 id="titulo-password">Cambiar contraseña</h2>
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
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={enviando} data-testid="btn-cambiar-password">
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
