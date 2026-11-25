import { useState, type FormEvent } from 'react';
import type { UpdateMyProfileRequest, UserDetail } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { required } from '@/shared/lib/validators';
import { ownFields, type OwnField } from '../lib/own-fields';

type Props = {
  profile: UserDetail;
  save: (changes: UpdateMyProfileRequest) => Promise<void>;
};

export function FormularioPerfil({ profile, save }: Props) {
  const fields = ownFields(profile.role);
  // Solo se validan los campos que aplican al rol.
  const ifApplicable = (field: OwnField, message: string) => (value: string) =>
    fields.includes(field) ? required(message)(value) : null;
  const form = useForm(
    {
      nombre: profile.paciente?.nombre ?? profile.odontologo?.nombre ?? '',
      apellido: profile.paciente?.apellido ?? '',
      telefono: profile.paciente?.telefono ?? '',
    },
    {
      nombre: ifApplicable('nombre', 'Escribe tu nombre'),
      apellido: ifApplicable('apellido', 'Escribe tu apellido'),
    },
  );
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
      // Solo se envían los campos que aplican al rol: el backend rechaza el resto.
      const changes: UpdateMyProfileRequest = {};
      for (const field of fields) changes[field] = form.values[field].trim();
      await save(changes);
      setSuccess('Perfil actualizado');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-perfil" noValidate>
      <h2 id="titulo-perfil">Datos personales</h2>
      <div className="form-row">
        {fields.includes('nombre') && (
          <TextField
            {...form.field('nombre')}
            label="Nombre"
            maxLength={100}
            autoComplete={profile.role === 'PACIENTE' ? 'given-name' : 'name'}
          />
        )}
        {fields.includes('apellido') && (
          <TextField
            {...form.field('apellido')}
            label="Apellido"
            maxLength={100}
            autoComplete="family-name"
          />
        )}
      </div>
      {fields.includes('telefono') && (
        <TextField
          {...form.field('telefono')}
          label="Teléfono (opcional)"
          type="tel"
          maxLength={30}
          autoComplete="tel"
        />
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={sending} data-testid="btn-guardar-perfil">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
