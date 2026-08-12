import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // NO se usa `manualChunks`. Antes agrupaba las librerías pesadas a mano
    // (xlsx / jspdf / recharts / react…) buscando mejorar el caché, pero al
    // introducir la carga diferida resultó contraproducente: forzar esos grupos
    // hacía que Rolldown creara dependencias cruzadas entre ellos, de modo que
    // el chunk de entrada acababa importando `pdf` y `charts` igualmente y el
    // lazy loading no servía de nada.
    //
    // La división automática ya separa cada `import()` dinámico en su propio
    // chunk, y todos llevan hash de contenido en el nombre, así que el beneficio
    // de caché (con `Cache-Control: immutable`, ver vercel.json) se conserva.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    // Solo tests unitarios/componente en src; los e2e de Playwright viven en /e2e.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
