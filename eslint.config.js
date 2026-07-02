import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Reglas nuevas del React Compiler (preview) que trae eslint-plugin-react-hooks v7
      // en su config "recommended". Marcan patrones idiomáticos y correctos de este
      // proyecto —resetear/cargar estado dentro de efectos de fetch, y APIs de terceros
      // como TanStack Table que devuelven funciones no memoizables— que NO son defectos.
      // Se desactivan para mantener el análisis enfocado en errores reales; las reglas
      // núcleo (rules-of-hooks, exhaustive-deps) siguen activas.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
  // Archivos que corren en Node (config de build/test, e2e de Playwright).
  {
    files: [
      '*.config.js',
      'e2e/**/*.js',
      'scripts/**/*.{js,mjs}',
      'src/test/**/*.js',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
