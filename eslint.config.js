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
