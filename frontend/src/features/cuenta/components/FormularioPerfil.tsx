import { useState, type FormEvent } from 'react';
import type { UpdateMyProfileRequest, UserDetail } from '@/api/types';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { camposPropios, type CampoPropio } from '../lib/campos-propios';

type Props = {
  perfil: UserDetail;
  guardar: (cambios: UpdateMyProfileRequest) => Promise<void>;
};

export function FormularioPerfil({ perfil, guardar }: Props) {
  const campos = camposPropios(perfil.role);
  const [form, setForm] = useState<Record<CampoPropio, string>>({
    nombre: perfil.paciente?.nombre ?? perfil.odontologo?.nombre ?? '',
    apellido: perfil.paciente?.apellido ?? '',
    telefono: perfil.paciente?.telefono ?? '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const update = (campo: CampoPropio) => (value: string) =>
    setForm((f) => ({ ...f, [campo]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    setEnviando(true);
    try {
      // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
      const cambios: UpdateMyProfileRequest = {};
      for (const campo of campos) cambios[campo] = form[campo];
      await guardar(cambios);
      setExito('Perfil actualizado');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-perfil">
      <h2 id="titulo-perfil">Editar perfil</h2>
      <div className="form-row">
        {campos.includes('nombre') && (
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => update('nombre')(e.target.value)}
              required
              autoComplete={perfil.role === 'PACIENTE' ? 'given-name' : 'name'}
            />
          </label>
        )}
        {campos.includes('apellido') && (
          <label>
            Apellido
            <input
              value={form.apellido}
              onChange={(e) => update('apellido')(e.target.value)}
              required
              autoComplete="family-name"
            />
          </label>
        )}
      </div>
      {campos.includes('telefono') && (
        <label>
          Teléfono (opcional)
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => update('telefono')(e.target.value)}
            autoComplete="tel"
          />
        </label>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
      <div className="form-actions">
        <button type="submit" disabled={enviando} data-testid="btn-guardar-perfil">
          {enviando ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>
    </form>
  );
}
