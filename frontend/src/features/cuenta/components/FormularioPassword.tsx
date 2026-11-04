import { useState, type FormEvent } from 'react';
import { useCambiarPassword } from '../hooks/useCambiarPassword';

const VACIO = { passwordActual: '', passwordNueva: '', confirmacion: '' };

export function FormularioPassword() {
  const cambiarPassword = useCambiarPassword();
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const update = (campo: keyof typeof VACIO) => (value: string) =>
    setForm((f) => ({ ...f, [campo]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    if (form.passwordNueva !== form.confirmacion) {
      setError('La confirmación no coincide con la nueva contraseña');
      return;
    }
    setEnviando(true);
    try {
      await cambiarPassword({
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
      });
      setForm(VACIO);
      setExito('Contraseña actualizada');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-password">
      <h2 id="titulo-password">Cambiar contraseña</h2>
      <label>
        Contraseña actual
        <input
          type="password"
          value={form.passwordActual}
          onChange={(e) => update('passwordActual')(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <label>
        Nueva contraseña
        <input
          type="password"
          value={form.passwordNueva}
          onChange={(e) => update('passwordNueva')(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <small className="muted">Mínimo 8 caracteres</small>
      </label>
      <label>
        Confirmar nueva contraseña
        <input
          type="password"
          value={form.confirmacion}
          onChange={(e) => update('confirmacion')(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {error}
        </p>
      )}
      {exito && (
        <p className="success" role="status">
          {exito}
        </p>
      )}
      <button type="submit" disabled={enviando} data-testid="btn-cambiar-password">
        {enviando ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
