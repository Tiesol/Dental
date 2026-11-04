import { iniciales } from '@/shared/lib/formato';

type Props = { name: string; large?: boolean };

// Decorativo: el nombre completo siempre aparece como texto junto al avatar.
export function Avatar({ name, large = false }: Props) {
  return (
    <span className={large ? 'avatar avatar-large' : 'avatar'} aria-hidden="true">
      {iniciales(name)}
    </span>
  );
}
