import { Link, type LinkProps } from 'react-router-dom';
import { buttonClass, type ButtonVariant } from '@/shared/lib/button-class';

type Props = LinkProps & { variant?: ButtonVariant };

// Navegación con aspecto de botón, como "Nuevo usuario". Comparte las variantes de Button.
export function ButtonLink({ variant = 'primary', className, ...rest }: Props) {
  return <Link {...rest} className={buttonClass(variant, className)} />;
}
