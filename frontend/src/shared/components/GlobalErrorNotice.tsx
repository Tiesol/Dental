import { useEffect, useState } from 'react';
import { buildErrorReport, isIgnorableError, type ErrorReport } from '@/shared/lib/error-report';
import { ErrorDetails } from './ErrorDetails';

// Manejador global de errores fuera del render (clics, timers, promesas sin catch): muestra un aviso
// sin tumbar la pantalla. Los errores esperados (validación, 4xx de negocio) los muestra cada pantalla.
export function GlobalErrorNotice() {
  const [report, setReport] = useState<ErrorReport | null>(null);

  useEffect(() => {
    const alFallar = (e: ErrorEvent) => {
      const error: unknown = e.error ?? e.message;
      if (!isIgnorableError(error, e.filename)) setReport(buildErrorReport(error));
    };
    const alRechazar = (e: PromiseRejectionEvent) => {
      if (!isIgnorableError(e.reason)) setReport(buildErrorReport(e.reason));
    };
    window.addEventListener('error', alFallar);
    window.addEventListener('unhandledrejection', alRechazar);
    return () => {
      window.removeEventListener('error', alFallar);
      window.removeEventListener('unhandledrejection', alRechazar);
    };
  }, []);

  if (!report) return null;
  return (
    <div className="error-notice" role="alert">
      <ErrorDetails key={report.fecha} report={report} onClose={() => setReport(null)} />
    </div>
  );
}
