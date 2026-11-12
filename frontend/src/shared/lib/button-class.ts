// Variantes visuales de los botones (ver DISENO.md, "Botones"). Las comparten Button y ButtonLink.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'tab' | 'ghost';

export function buttonClass(variant: ButtonVariant, extra?: string): string {
  return extra ? `btn btn-${variant} ${extra}` : `btn btn-${variant}`;
}
