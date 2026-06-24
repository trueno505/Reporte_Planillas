import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Limpia el DOM tras cada test.
afterEach(() => {
  cleanup()
})

// react-hot-toast: no necesitamos render real; espiamos las llamadas.
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// jsdom no implementa Blob/File.arrayBuffer; lo simulamos (el contenido no
// importa porque XLSX.read está mockeado en los tests).
if (!globalThis.File?.prototype?.arrayBuffer) {
  globalThis.File.prototype.arrayBuffer = function () {
    return Promise.resolve(new ArrayBuffer(0))
  }
}
