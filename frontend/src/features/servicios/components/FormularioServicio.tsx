import { useState, type FormEvent } from 'react';
import type { CreateServiceRequest, ServiceResponse } from '@/api/types';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { MONEDA } from '@/shared/lib/formato';

export type DatosServicio = Required<Omit<CreateServiceRequest, 'activo'>> & { activo: boolean };

type Props = {
  inicial?: ServiceResponse;
  textoBoton: string;
  textoBotonEnviando: string;
  // El estado solo se elige al crear; al editar se cambia con su propio botón.
  conEstado: boolean;
  onSubmit: (datos: DatosServicio) => Promise<void>;
};

// Valida en cliente con las mismas reglas que el backend (que vuelve a validar todo).
function validar(duracion: string, precio: string): string | null {
  const d = Number(duracion);
  if (!Number.isInteger(d) || d < 1 || d > 480) {
    return 'La duración debe ser un número entero de minutos entre 1 y 480';
  }
  if (precio.trim() !== '') {
    const p = Number(precio);
    if (!Number.isFinite(p) || p < 0) return 'El precio no puede ser negativo';
    if (Math.round(p * 100) !== p * 100) return 'El precio admite hasta 2 decimales';
  }
  return null;
}

export function FormularioServicio({
  inicial,
  textoBoton,
  textoBotonEnviando,
  conEstado,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre ?? '',
    descripcion: inicial?.descripcion ?? '',
    duracionMin: inicial ? String(inicial.duracionMin) : '30',
    precioReferencial: inicial?.precioReferencial == null ? '' : String(inicial.precioReferencial),
    activo: inicial?.activo ?? true,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const update =
    (campo: 'nombre' | 'descripcion' | 'duracionMin' | 'precioReferencial') => (value: string) =>
      setForm((f) => ({ ...f, [campo]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    const invalido = validar(form.duracionMin, form.precioReferencial);
    if (invalido) {
      setError(invalido);
      return;
    }
    setEnviando(true);
    try {
      await onSubmit({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        duracionMin: Number(form.duracionMin),
        precioReferencial:
          form.precioReferencial.trim() === '' ? null : Number(form.precioReferencial),
        activo: form.activo,
      });
      setExito('Cambios guardados');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <label>
        Nombre
        <input
          value={form.nombre}
          onChange={(e) => update('nombre')(e.target.value)}
          required
          maxLength={100}
          placeholder="Limpieza dental"
        />
      </label>
      <label>
        Descripción
        <textarea
          value={form.descripcion}
          onChange={(e) => update('descripcion')(e.target.value)}
          required
          maxLength={500}
          rows={3}
        />
      </label>
      <div className="form-row">
        <label>
          Duración estimada (minutos)
          <input
            type="number"
            inputMode="numeric"
            value={form.duracionMin}
            onChange={(e) => update('duracionMin')(e.target.value)}
            required
            min={1}
            max={480}
            step={1}
          />
        </label>
        <label>
          Precio referencial en {MONEDA} (opcional)
          <input
            type="number"
            inputMode="decimal"
            value={form.precioReferencial}
            onChange={(e) => update('precioReferencial')(e.target.value)}
            min={0}
            step={0.01}
            placeholder="Sin precio"
          />
        </label>
      </div>
      {conEstado && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
          />
          Habilitado para nuevas reservas
        </label>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
      <div className="form-actions">
        <button type="submit" disabled={enviando} data-testid="btn-guardar-servicio">
          {enviando ? textoBotonEnviando : textoBoton}
        </button>
      </div>
    </form>
  );
}
