import { initials } from '@/shared/lib/format';

type Props = { name: string };

// Decorativo: el nombre completo siempre aparece como texto junto al avatar.
export function Avatar({ name }: Props) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
