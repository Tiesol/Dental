type Props = { active: boolean };

export function ActiveBadge({ active }: Props) {
  return (
    <span className={active ? 'badge badge-ok' : 'badge badge-off'}>
      {active ? 'Habilitado' : 'Deshabilitado'}
    </span>
  );
}
