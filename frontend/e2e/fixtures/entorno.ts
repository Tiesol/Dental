// Constantes del entorno de E2E, compartidas por playwright.config.ts y los escenarios.
export const PUERTO_FRONTEND = 5199;
export const PUERTO_BACKEND = 3100;
export const API_URL = `http://localhost:${PUERTO_BACKEND}/api/v1`;

// Lunes 9 de noviembre de 2026, 08:00 en La Paz: antes de que abra la clínica. El backend
// (CLOCK_NOW) y el navegador (page.clock) comparten esta hora, así que los horarios del seed
// existen siempre y nunca caen en el pasado.
export const AHORA = '2026-11-09T12:00:00.000Z';
export const HOY = '2026-11-09';
export const MANIANA = '2026-11-10';
