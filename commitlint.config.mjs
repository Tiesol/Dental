// Convención de commits del proyecto (ver CONTRIBUTING.md sección "Commits").
// La aplica el hook commit-msg (husky) y el job commitlint del CI.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'test',
        'docs',
        'chore',
        'ci',
        'build',
        'perf',
        'style',
        'revert',
      ],
    ],
    // Ámbitos permitidos. El ámbito es opcional, pero si se pone debe ser uno de estos.
    'scope-enum': [
      2,
      'always',
      [
        // backend: módulos y capas
        'auth',
        'users',
        'dentists',
        'services',
        'availability',
        'appointments',
        'observations',
        'prisma',
        'common',
        'config',
        // frontend: features y capas
        'reserva',
        'mis-citas',
        'agenda',
        'servicios',
        'odontologos',
        'admin',
        'cuenta',
        'api',
        'shared',
        'e2e',
        // transversales
        'backend',
        'frontend',
        'docs',
        'ci',
        'deps',
        'claude',
      ],
    ],
    'scope-empty': [0],
    'header-max-length': [2, 'always', 72],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Descripción en minúscula inicial por convención (CONTRIBUTING.md). No se rechaza
    // "sentence-case" para que los marcadores "RED - ..." y "GREEN - ..." del ciclo TDD sigan
    // siendo válidos; sí se rechazan Title Case, PascalCase y TODO EN MAYÚSCULAS.
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'body-max-line-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
