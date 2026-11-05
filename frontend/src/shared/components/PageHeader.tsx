import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

type Props = {
  title: string;
  description?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
};

export function PageHeader({ title, description, back, actions }: Props) {
  useEffect(() => {
    document.title = `${title} · Clínica Dental`;
  }, [title]);

  return (
    <div className="page-header">
      {back && (
        <Link to={back.to} className="back-link">
          <Icon name="back" />
          {back.label}
        </Link>
      )}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
