type Props = { active: boolean; activeLabel?: string };

export function ActiveBadge({ active, activeLabel = 'Habilitado' }: Props) {
  return (
    <span className={active ? 'badge badge-ok' : 'badge badge-off'}>
      {active ? activeLabel : 'Deshabilitado'}
    </span>
  );
}
