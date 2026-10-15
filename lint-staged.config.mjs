// Se ejecuta en el hook pre-commit (husky) solo sobre los archivos en stage.
// Este archivo cubre únicamente la raíz. backend/ y frontend/ tienen su propio
// .lintstagedrc.json: lint-staged usa el más cercano a cada archivo y ejecuta sus comandos
// desde esa carpeta, así cada una aplica su ESLint y su Prettier.
export default {
  '*.{md,json,yml,yaml,mjs}': 'prettier --write',
  '.github/**/*.{yml,yaml,md}': 'prettier --write',
};
