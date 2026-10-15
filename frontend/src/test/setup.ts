import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// La API se simula con MSW en todos los tests de componentes (CONVENCIONES.md sección 6).
// Cualquier petición sin handler falla el test: así ningún test depende de un backend real.
// (MSW 3 llama "frame" a una petición HTTP o conexión WebSocket.)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => server.close());
