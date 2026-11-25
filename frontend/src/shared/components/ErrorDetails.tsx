import { useId, useState } from 'react';
import { formatErrorReport, type ErrorReport } from '@/shared/lib/error-report';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  report: ErrorReport;
  // Solo el aviso flotante se puede cerrar; la pantalla de error no.
  onClose?: () => void;
};

type CopyState = 'pendiente' | 'copiado' | 'fallido';

// Aviso de un error inesperado en dos niveles: qué hacer (copiar el detalle y enviárselo al
// administrador) y, desplegable, el detalle técnico.
export function ErrorDetails({ report, onClose }: Props) {
  const titleId = useId();
  const [copyState, setCopyState] = useState<CopyState>('pendiente');
  const detail = formatErrorReport(report);

  const copy = () => {
    if (!navigator.clipboard) {
      setCopyState('fallido');
      return;
    }
    navigator.clipboard
      .writeText(detail)
      .then(() => setCopyState('copiado'))
      .catch(() => setCopyState('fallido'));
  };

  return (
    <section className="error-details" aria-labelledby={titleId}>
      <div className="error-details-head">
        <Icon name="alert" />
        <div className="error-details-text">
          <h2 id={titleId}>Ocurrió un error inesperado</h2>
          <p>Copia el detalle y envíaselo al administrador del sistema.</p>
        </div>
        {onClose && (
          <Button variant="ghost" aria-label="Cerrar aviso" onClick={onClose}>
            <Icon name="close" />
          </Button>
        )}
      </div>
      <div className="error-details-actions">
        <Button onClick={copy}>
          <Icon name="copy" />
          {copyState === 'copiado' ? 'Detalle copiado' : 'Copiar detalle'}
        </Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <Icon name="refresh" />
          Recargar
        </Button>
      </div>
      {copyState === 'fallido' && (
        <p className="text-error">No se pudo copiar. Selecciona el detalle técnico y cópialo.</p>
      )}
      <details className="error-details-tech">
        <summary>Detalle técnico</summary>
        <pre>{detail}</pre>
      </details>
    </section>
  );
}
