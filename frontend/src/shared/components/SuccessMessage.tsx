import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <p className="message message-success" role="status">
      <Icon name="check" />
      <span>{children}</span>
    </p>
  );
}
