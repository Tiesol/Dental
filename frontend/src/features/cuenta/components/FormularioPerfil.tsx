import { useState, type FormEvent } from 'react';
import type { UpdateMyProfileRequest, UserDetail } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { required } from '@/shared/lib/validators';
import { camposPropios, type CampoPropio } from '../lib/campos-propios';

type Props = {
  perfil: UserDetail;
  guardar: (cambios: UpdateMyProfileRequest) => Promise<void>;
};

export function FormularioPerfil({ perfil, guardar }: Props) {
  const campos = camposPropios(perfil.role);
  // Solo se validan los campos que aplican al rol.
  const siAplica = (campo: CampoPropio, mensaje: string) => (valor: string) =>
    campos.includes(campo) ? required(mensaje)(valor) : null;
  const form = useForm(
    {
      nombre: perfil.paciente?.nombre ?? perfil.odontologo?.nombre ?? '',
      apellido: perfil.paciente?.apellido ?? '',
      telefono: perfil.paciente?.telefono ?? '',
    },
    {
      nombre: siAplica('nombre', 'Escribe tu nombre'),
      apellido: siAplica('apellido', 'Escribe tu apellido'),
    },
  );
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
      // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
      const cambios: UpdateMyProfileRequest = {};
      for (const campo of campos) cambios[campo] = form.values[campo].trim();
      await guardar(cambios);
      setExito('Perfil actualizado');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-perfil" noValidate>
      <h2 id="titulo-perfil">Editar perfil</h2>
      <div className="form-row">
        {campos.includes('nombre') && (
          <TextField
            {...form.field('nombre')}
            label="Nombre"
            maxLength={100}
            autoComplete={perfil.role === 'PACIENTE' ? 'given-name' : 'name'}
          />
        )}
        {campos.includes('apellido') && (
          <TextField
            {...form.field('apellido')}
            label="Apellido"
            maxLength={100}
            autoComplete="family-name"
          />
        )}
      </div>
      {campos.includes('telefono') && (
        <TextField
          {...form.field('telefono')}
          label="Teléfono (opcional)"
          type="tel"
          maxLength={30}
          autoComplete="tel"
        />
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={enviando} data-testid="btn-guardar-perfil">
          Guardar perfil
        </Button>
      </div>
    </form>
  );
}
