import { useState, type FormEvent } from 'react';
import type { CreateServiceRequest, ServiceResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { TextArea } from '@/shared/components/TextArea';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { MONEDA } from '@/shared/lib/formato';
import { required } from '@/shared/lib/validators';

export type DatosServicio = Required<Omit<CreateServiceRequest, 'activo'>> & { activo: boolean };

type Props = {
  inicial?: ServiceResponse;
  textoBoton: string;
  // El estado solo se elige al crear; al editar se cambia con su propio botón.
  conEstado: boolean;
  onSubmit: (datos: DatosServicio) => Promise<void>;
};

// Mismas reglas que el backend, que vuelve a validar todo.
function validarDuracion(valor: string): string | null {
  if (valor.trim() === '') return 'Escribe la duración en minutos';
  const minutos = Number(valor);
  return Number.isInteger(minutos) && minutos >= 1 && minutos <= 480
    ? null
    : 'La duración debe ser un número entero de minutos entre 1 y 480';
}

function validarPrecio(valor: string): string | null {
  if (valor.trim() === '') return null;
  const precio = Number(valor);
  if (!Number.isFinite(precio) || precio < 0) return 'El precio no puede ser negativo';
  if (Math.round(precio * 100) !== precio * 100) return 'El precio admite hasta 2 decimales';
  return null;
}

export function FormularioServicio({ inicial, textoBoton, conEstado, onSubmit }: Props) {
  const form = useForm(
    {
      nombre: inicial?.nombre ?? '',
      descripcion: inicial?.descripcion ?? '',
      duracionMin: inicial ? String(inicial.duracionMin) : '30',
      precioReferencial:
        inicial?.precioReferencial == null ? '' : String(inicial.precioReferencial),
    },
    {
      nombre: required('Escribe el nombre del servicio'),
      descripcion: required('Escribe la descripción'),
      duracionMin: validarDuracion,
      precioReferencial: validarPrecio,
    },
  );
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    if (!form.validate()) return;
    const { nombre, descripcion, duracionMin, precioReferencial } = form.values;
    setEnviando(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        duracionMin: Number(duracionMin),
        precioReferencial: precioReferencial.trim() === '' ? null : Number(precioReferencial),
        activo,
      });
      setExito('Cambios guardados');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
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
          label={`Precio referencial en ${MONEDA} (opcional)`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          placeholder="Sin precio"
        />
      </div>
      {conEstado && (
        <label className="checkbox">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Habilitado para nuevas reservas
        </label>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
      <div className="form-actions">
        <Button type="submit" loading={enviando} data-testid="btn-guardar-servicio">
          {textoBoton}
        </Button>
      </div>
    </form>
  );
}
