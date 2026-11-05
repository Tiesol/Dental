import type { ServiceResponse } from '@/api/types';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { formatearDuracion } from '@/shared/lib/formato';

type Props = {
  servicios: ServiceResponse[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

// Casillas para elegir los servicios que realiza un odontólogo.
export function SelectorServicios({ servicios, seleccionados, onChange, disabled }: Props) {
  const alternar = (id: string, marcado: boolean) =>
    onChange(marcado ? [...seleccionados, id] : seleccionados.filter((s) => s !== id));

  return (
    <fieldset className="selector" disabled={disabled}>
      <legend>Servicios que realiza</legend>
      {servicios.length === 0 && <p className="muted">No hay servicios creados todavía.</p>}
      {servicios.map((s) => (
        <label key={s.id} className="checkbox">
          <input
            type="checkbox"
            checked={seleccionados.includes(s.id)}
            onChange={(e) => alternar(s.id, e.target.checked)}
          />
          <span>
            {s.nombre} <span className="muted">· {formatearDuracion(s.duracionMin)}</span>
            {!s.activo && <ActiveBadge active={false} />}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
