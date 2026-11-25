import type { ServiceResponse } from '@/api/types';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { formatDuration } from '@/shared/lib/format';

type Props = {
  services: ServiceResponse[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

// Casillas para elegir los servicios que realiza un odontólogo.
export function SelectorServicios({ services, selected, onChange, disabled }: Props) {
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selected, id] : selected.filter((s) => s !== id));

  return (
    <fieldset className="selector" disabled={disabled}>
      <legend>Servicios que realiza</legend>
      {services.length === 0 && <p className="muted">No hay servicios creados todavía.</p>}
      {services.map((s) => (
        <label key={s.id} className="checkbox">
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            onChange={(e) => toggle(s.id, e.target.checked)}
          />
          <span>
            {s.nombre} <span className="muted">· {formatDuration(s.duracionMin)}</span>
            {!s.activo && <ActiveBadge active={false} />}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
