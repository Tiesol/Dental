import { ApiError } from '@/api/errors';

// Datos de un error inesperado para que el usuario se los copie al administrador del sistema.
export type ErrorReport = {
  fecha: string;
  pantalla: string;
  usuario: string | null;
  nombre: string;
  mensaje: string;
  estadoHttp: number | null;
  codigo: string | null;
  stack: string | null;
  componentes: string | null;
};

// Quién usa la aplicación, para el detalle técnico. Lo actualiza AuthProvider al cambiar la sesión.
let usuarioActual: string | null = null;

export function setErrorReportUser(usuario: string | null): void {
  usuarioActual = usuario;
}

function codigoDelBackend(error: ApiError): string | null {
  const { details } = error;
  if (details && typeof details === 'object' && 'error' in details) {
    const { error: codigo } = details as { error: unknown };
    if (typeof codigo === 'string') return codigo;
  }
  return null;
}

export function buildErrorReport(error: unknown, componentes?: string | null): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const api = error instanceof ApiError ? error : null;
  return {
    fecha: new Date().toISOString(),
    pantalla: `${window.location.pathname}${window.location.search}`,
    usuario: usuarioActual,
    nombre: err.name,
    mensaje: err.message,
    estadoHttp: api ? api.statusCode : null,
    codigo: api ? codigoDelBackend(api) : null,
    stack: err.stack ?? null,
    componentes: componentes?.trim() || null,
  };
}

export function formatErrorReport(reporte: ErrorReport): string {
  return [
    `Fecha: ${reporte.fecha}`,
    `Pantalla: ${reporte.pantalla}`,
    `Usuario: ${reporte.usuario ?? 'sin sesión'}`,
    `Error: ${reporte.nombre}: ${reporte.mensaje}`,
    reporte.estadoHttp !== null ? `Estado HTTP: ${reporte.estadoHttp}` : null,
    reporte.codigo ? `Código: ${reporte.codigo}` : null,
    reporte.stack ? `Stack:\n${reporte.stack}` : null,
    reporte.componentes ? `Componentes:\n${reporte.componentes}` : null,
  ]
    .filter((linea) => linea !== null)
    .join('\n');
}

const RUIDO_DEL_NAVEGADOR = [/ResizeObserver loop/i, /^Script error\.?$/i];
const EXTENSION = /(chrome|moz|safari(-web)?)-extension:\/\//;

// Cancelaciones de peticiones y ruido del navegador o de extensiones: no son fallos de la aplicación.
export function isIgnorableError(error: unknown, origen?: string): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  const mensaje = error instanceof Error ? error.message : String(error ?? '');
  if (RUIDO_DEL_NAVEGADOR.some((patron) => patron.test(mensaje))) return true;
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  return EXTENSION.test(origen ?? '') || EXTENSION.test(stack);
}
