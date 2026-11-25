import { useState, type FormEvent } from 'react';
import type { CreateServiceRequest, ServiceResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextArea } from '@/shared/components/TextArea';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { CURRENCY } from '@/shared/lib/format';
import { required } from '@/shared/lib/validators';

export type ServiceFormData = Required<Omit<CreateServiceRequest, 'activo'>> & { activo: boolean };

type Props = {
  initial?: ServiceResponse;
  buttonText: string;
  // El estado solo se elige al crear; al editar se cambia con su propio botón.
  withStatus: boolean;
  onSubmit: (data: ServiceFormData) => Promise<void>;
};

// Mismas reglas que el backend, que vuelve a validar todo.
function validateDuration(value: string): string | null {
  if (value.trim() === '') return 'Escribe la duración en minutos';
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 480
    ? null
    : 'La duración debe ser un número entero de minutos entre 1 y 480';
}

function validatePrice(value: string): string | null {
  if (value.trim() === '') return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return 'El precio no puede ser negativo';
  if (Math.round(price * 100) !== price * 100) return 'El precio admite hasta 2 decimales';
  return null;
}

export function FormularioServicio({ initial, buttonText, withStatus, onSubmit }: Props) {
  const form = useForm(
    {
      nombre: initial?.nombre ?? '',
      descripcion: initial?.descripcion ?? '',
      duracionMin: initial ? String(initial.duracionMin) : '30',
      precioReferencial:
        initial?.precioReferencial == null ? '' : String(initial.precioReferencial),
    },
    {
      nombre: required('Escribe el nombre del servicio'),
      descripcion: required('Escribe la descripción'),
      duracionMin: validateDuration,
      precioReferencial: validatePrice,
    },
  );
  const [active, setActive] = useState(initial?.activo ?? true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.validate()) return;
    const {
      nombre: name,
      descripcion: description,
      duracionMin: durationMin,
      precioReferencial: referencePrice,
    } = form.values;
    setSending(true);
    try {
      await onSubmit({
        nombre: name.trim(),
        descripcion: description.trim(),
        duracionMin: Number(durationMin),
        precioReferencial: referencePrice.trim() === '' ? null : Number(referencePrice),
        activo: active,
      });
      setSuccess('Cambios guardados');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <TextField
        {...form.field('nombre')}
        label="Nombre"
        maxLength={100}
        placeholder="Limpieza dental"
      />
      <TextArea {...form.field('descripcion')} label="Descripción" maxLength={500} rows={3} />
      <div className="form-row">
        <TextField
          {...form.field('duracionMin')}
          label="Duración estimada (minutos)"
          type="number"
          inputMode="numeric"
          min={1}
          max={480}
          step={1}
        />
        <TextField
          {...form.field('precioReferencial')}
          label={`Precio referencial en ${CURRENCY} (opcional)`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          placeholder="Sin precio"
        />
      </div>
      {withStatus && (
        <label className="checkbox">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Habilitado para nuevas reservas
        </label>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={sending} data-testid="btn-guardar-servicio">
          {buttonText}
        </Button>
      </div>
    </form>
  );
}
