import { execSync } from 'node:child_process';

// Aplica las migraciones a la BD de test antes de la suite.
// Los datos se limpian con TRUNCATE antes de cada test (ver helpers.ts).
// Para un reset completo: npm run db:test:reset
export default function globalSetup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
