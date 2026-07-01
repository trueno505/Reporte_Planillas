import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Separar librerías pesadas en chunks propios: cada una lleva su propio hash
    // en el nombre y se sirve con `Cache-Control: immutable` (ver vercel.json),
    // así el navegador las cachea a largo plazo y solo re-descarga el código de
    // la app cuando cambia — no todo el bundle en cada despliegue.
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) exige manualChunks como función.
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (!p.includes('/node_modules/')) return
          if (p.includes('/@supabase/')) return 'supabase'
          if (p.includes('/xlsx')) return 'xlsx'
          if (p.includes('/jspdf') || p.includes('/html2canvas') || p.includes('/dompurify')) return 'pdf'
          if (p.includes('/recharts') || p.includes('/d3-') || p.includes('/victory-') || p.includes('/internmap')) return 'charts'
          if (p.includes('/@tanstack/')) return 'table'
          if (p.includes('/react-router') || p.includes('/react-dom') || p.includes('/react/') || p.includes('/scheduler/')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
    // Los vendors grandes ya van en su chunk cacheable; subimos el umbral del
    // aviso para no alarmar por chunks que son intencionalmente separados.
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
