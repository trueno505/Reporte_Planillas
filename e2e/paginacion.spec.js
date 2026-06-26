import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/supabaseMock.js'

// 51 trabajadores ya ordenados por apellidos (zero-pad para que el orden
// ascendente coincida con el del array). Solo se llenan algunas columnas: el
// resto quedan vacías a propósito para probar la validación al editar.
function filas(n) {
  return Array.from({ length: n }, (_, i) => {
    const k = i + 1
    return {
      id: k,
      dni: 1000 + k,
      apellidos_y_nombres: `TRABAJADOR ${String(k).padStart(3, '0')}`,
      r_basica: 100,
      t_ingreso: 100,
      t_dsctos: 0,
      t_liquido: 100,
    }
  })
}

test.describe('Paginación + validación (e2e)', () => {
  test('pagina 50 por página y calcula el total (51 → 2 páginas)', async ({ page }) => {
    await mockSupabase(page, { rows: filas(51) })
    await page.goto('/planilla/cas-general')

    // Página 1: primer trabajador visible, el 51 todavía no.
    await expect(page.getByText('TRABAJADOR 001')).toBeVisible()
    await expect(page.getByText('TRABAJADOR 051')).toHaveCount(0)

    // Control de paginación con el total real.
    const paginacion = page.getByRole('navigation', { name: 'Paginación' })
    await expect(paginacion).toBeVisible()
    await expect(paginacion.getByText(/Mostrando/)).toContainText('51')
    await expect(paginacion.getByRole('button', { name: '1', exact: true })).toBeVisible()
    await expect(paginacion.getByRole('button', { name: '2', exact: true })).toBeVisible()
    await expect(paginacion.getByRole('button', { name: '3', exact: true })).toHaveCount(0)

    // En la primera página "Anterior" está deshabilitado.
    await expect(paginacion.getByRole('button', { name: /Anterior/ })).toBeDisabled()
    await expect(paginacion.getByRole('button', { name: /Siguiente/ })).toBeEnabled()

    // Ir a la página 2: aparece el trabajador 51 y "Siguiente" se deshabilita.
    await paginacion.getByRole('button', { name: /Siguiente/ }).click()
    await expect(page.getByText('TRABAJADOR 051')).toBeVisible()
    await expect(page.getByText('TRABAJADOR 001')).toHaveCount(0)
    await expect(paginacion.getByRole('button', { name: /Siguiente/ })).toBeDisabled()
    await expect(paginacion.getByRole('button', { name: /Anterior/ })).toBeEnabled()
  })

  test('planilla vacía: estado vacío y sin control de paginación', async ({ page }) => {
    await mockSupabase(page, { rows: [] })
    await page.goto('/planilla/cas-general')

    await expect(page.getByText(/Aún no hay trabajadores en esta planilla/i)).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Paginación' })).toHaveCount(0)
  })

  test('la planilla ya no tiene botón "Nuevo registro" (solo el global del menú)', async ({ page }) => {
    await mockSupabase(page, { rows: filas(3) })
    await page.goto('/planilla/cas-general')
    await expect(page.getByText('TRABAJADOR 001')).toBeVisible()

    // No existe el botón de alta en la planilla…
    await expect(page.getByRole('button', { name: 'Nuevo registro' })).toHaveCount(0)
    // …pero el acceso global (enlace del menú) sí sigue.
    await expect(page.getByRole('link', { name: 'Nuevo registro' })).toBeVisible()
    // La edición por fila se conserva.
    await expect(page.getByRole('button', { name: 'Editar' }).first()).toBeVisible()
  })

  test('al editar exige completar los campos vacíos', async ({ page }) => {
    await mockSupabase(page, { rows: filas(3) })
    await page.goto('/planilla/cas-general')
    await expect(page.getByText('TRABAJADOR 001')).toBeVisible()

    // Abrir el modal de edición de la primera fila.
    await page.getByRole('button', { name: 'Editar' }).first().click()
    const dialog = page.locator('.fixed.inset-0')
    await expect(dialog.getByText(/Editar registro/i)).toBeVisible()

    // Intentar guardar con campos vacíos → toast de validación y modal abierto.
    await dialog.getByRole('button', { name: 'Actualizar' }).click()
    await expect(page.getByText(/Completa todos los campos/i)).toBeVisible()
    await expect(dialog.getByText(/Editar registro/i)).toBeVisible()
  })
})
