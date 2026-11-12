import type { ButtonHTMLAttributes, Ref } from 'react';
import { buttonClass, type ButtonVariant } from '@/shared/lib/button-class';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  // Solo en botones que esperan una respuesta del servidor (guardar, enviar, confirmar). Los que
  // actúan al instante (abrir, cancelar, navegar, copiar) no lo usan.
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

// Botón compartido: hover, active y estado de carga. Al cargar muestra un spinner, se deshabilita
// (sin doble envío), avisa con aria-busy y conserva el ancho porque el texto solo se oculta.
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className="btn-label">{children}</span>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
    </button>
  );
}
