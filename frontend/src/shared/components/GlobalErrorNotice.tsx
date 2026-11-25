import { useEffect, useState } from 'react';
import { buildErrorReport, isIgnorableError, type ErrorReport } from '@/shared/lib/error-report';
import { ErrorDetails } from './ErrorDetails';

// Manejador global de errores fuera del render (clics, timers, promesas sin catch): muestra un aviso
// sin tumbar la pantalla. Los errores esperados (validación, 4xx de negocio) los muestra cada pantalla.
export function GlobalErrorNotice() {
  const [report, setReport] = useState<ErrorReport | null>(null);

  useEffect(() => {
    const onFail = (e: ErrorEvent) => {
      const error: unknown = e.error ?? e.message;
      if (!isIgnorableError(error, e.filename)) setReport(buildErrorReport(error));
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (!isIgnorableError(e.reason)) setReport(buildErrorReport(e.reason));
    };
    window.addEventListener('error', onFail);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onFail);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!report) return null;
  return (
    <div className="error-notice" role="alert">
      <ErrorDetails key={report.date} report={report} onClose={() => setReport(null)} />
    </div>
  );
}
