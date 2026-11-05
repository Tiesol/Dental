import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests unitarios y de componentes (Vitest + React Testing Library + MSW).
// Los E2E viven en e2e/ y los corre Playwright, no Vitest.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
    // user.type escribe carácter a carácter: con la máquina cargada, 5 s no alcanzaban.
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/api/**', 'src/shared/lib/**', 'src/features/**/hooks/**'],
      exclude: ['src/test/**', '**/*.test.*', '**/index.ts'],
    },
  },
});
