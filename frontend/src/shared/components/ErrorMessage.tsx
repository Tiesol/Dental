import type { ReactNode } from 'react';
import { Icon } from './Icon';

// El data-testid lo usan los E2E: no renombrar (CONVENCIONES.md sección 4).
export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p className="message message-error" role="alert" data-testid="error-mensaje">
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}
