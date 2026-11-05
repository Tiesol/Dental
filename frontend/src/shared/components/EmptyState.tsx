import type { ReactNode } from 'react';

type Props = { title: string; description?: string; action?: ReactNode };

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
