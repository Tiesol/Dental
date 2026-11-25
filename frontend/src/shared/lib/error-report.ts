import { ApiError } from '@/api/errors';

// Datos de un error inesperado para que el usuario se los copie al administrador del sistema.
export type ErrorReport = {
  date: string;
  screen: string;
  user: string | null;
  name: string;
  message: string;
  httpStatus: number | null;
  code: string | null;
  stack: string | null;
  components: string | null;
};

// Quién usa la aplicación, para el detalle técnico. Lo actualiza AuthProvider al cambiar la sesión.
let currentUser: string | null = null;

export function setErrorReportUser(user: string | null): void {
  currentUser = user;
}

function backendCode(error: ApiError): string | null {
  const { details } = error;
  if (details && typeof details === 'object' && 'error' in details) {
    const { error: code } = details as { error: unknown };
    if (typeof code === 'string') return code;
  }
  return null;
}

export function buildErrorReport(error: unknown, components?: string | null): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const api = error instanceof ApiError ? error : null;
  return {
    date: new Date().toISOString(),
    screen: `${window.location.pathname}${window.location.search}`,
    user: currentUser,
    name: err.name,
    message: err.message,
    httpStatus: api ? api.statusCode : null,
    code: api ? backendCode(api) : null,
    stack: err.stack ?? null,
    components: components?.trim() || null,
  };
}

export function formatErrorReport(report: ErrorReport): string {
  return [
    `Fecha: ${report.date}`,
    `Pantalla: ${report.screen}`,
    `Usuario: ${report.user ?? 'sin sesión'}`,
    `Error: ${report.name}: ${report.message}`,
    report.httpStatus !== null ? `Estado HTTP: ${report.httpStatus}` : null,
    report.code ? `Código: ${report.code}` : null,
    report.stack ? `Stack:\n${report.stack}` : null,
    report.components ? `Componentes:\n${report.components}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

const BROWSER_NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i];
const EXTENSION = /(chrome|moz|safari(-web)?)-extension:\/\//;

// Cancelaciones de peticiones y ruido del navegador o de extensiones: no son fallos de la aplicación.
export function isIgnorableError(error: unknown, source?: string): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (BROWSER_NOISE.some((pattern) => pattern.test(message))) return true;
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  return EXTENSION.test(source ?? '') || EXTENSION.test(stack);
}
