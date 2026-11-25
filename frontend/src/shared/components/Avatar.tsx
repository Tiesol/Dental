import { iniciales } from '@/shared/lib/formato';

type Props = { name: string };

// Decorativo: el nombre completo siempre aparece como texto junto al avatar.
export function Avatar({ name }: Props) {
  return (
    <span className="avatar" aria-hidden="true">
      {iniciales(name)}
    </span>
  );
}
