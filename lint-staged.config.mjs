// Se ejecuta en el hook pre-commit (husky) solo sobre los archivos en stage.
// Cada carpeta usa su propio ESLint y Prettier, por eso se entra a ella antes de correrlos.
const quote = (files) => files.map((f) => `"${f}"`).join(' ');
const inDir = (dir, cmd) => (files) => `cd ${dir} && ${cmd} ${quote(files)}`;

export default {
  'backend/**/*.ts': [
    inDir('backend', 'npx eslint --fix'),
    inDir('backend', 'npx prettier --write'),
  ],
  'backend/**/*.{json,md}': [inDir('backend', 'npx prettier --write')],
  'frontend/**/*.{ts,tsx}': [
    inDir('frontend', 'npx eslint --fix'),
    inDir('frontend', 'npx prettier --write'),
  ],
  'frontend/**/*.{json,md,css,html}': [inDir('frontend', 'npx prettier --write')],
  '*.{md,json,yml,yaml,mjs}': 'prettier --write',
  '.github/**/*.{yml,yaml,md}': 'prettier --write',
};
