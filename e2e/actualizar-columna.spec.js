import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
import { mockSupabase } from './support/supabaseMock.js'

// Genera un .xlsx real en memoria (lo parsea el XLSX del navegador, sin mock).
function excelBuffer(rows) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

test.describe('Actualizar columna por Excel (e2e)', () => {
  test('actualiza una columna por DNI mostrando la vista previa', async ({ page }) => {
    const { rpcCalls } = await mockSupabase(page)

    await page.goto('/planilla/cas-general')

    // La tabla cargó con las filas mockeadas.
    await expect(page.getByText('PEREZ JUAN')).toBeVisible()

    // Abrir el modal de actualización.
    await page.getByRole('button', { name: /Actualizar columna/i }).click()
    const dialog = page.locator('.fixed.inset-0')
    await expect(dialog.getByText(/Actualizar columna por Excel/i)).toBeVisible()

    // Elegir la columna a actualizar.
    await dialog.getByRole('combobox').selectOption('r_basica')

    // Subir un Excel real: DNI 111 existe, 999 no.
    const buffer = excelBuffer([
      { DNI: 111, 'R. Básica': 500 },
      { DNI: 999, 'R. Básica': 999 },
    ])
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      dialog.getByRole('button', { name: /Subir Excel/i }).click(),
    ])
    await chooser.setFiles({
      name: 'datos.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    })

    // Vista previa: 1 a actualizar, 1 no encontrado.
    await expect(dialog.getByText('Se actualizarán', { exact: true })).toBeVisible()
    await expect(dialog.getByText('PEREZ JUAN')).toBeVisible()
    await expect(dialog.getByText(/no existe en esta planilla/i)).toContainText('999')

    // Confirmar.
    await dialog.getByRole('button', { name: /Confirmar \(1\)/i }).click()

    // El RPC se llamó con la columna y solo el DNI existente.
    await expect.poll(() => rpcCalls.length).toBe(1)
    expect(rpcCalls[0]).toMatchObject({
      p_tabla: 'cas_general',
      p_columna: 'r_basica',
      p_valores: [{ dni: 111, valor: 500 }],
    })

    // Toast de éxito y modal cerrado.
    await expect(page.getByText(/registros actualizados/i)).toBeVisible()
    await expect(page.getByText(/Actualizar columna por Excel/i)).toBeHidden()
  })

  test('no permite confirmar si ningún DNI existe', async ({ page }) => {
    const { rpcCalls } = await mockSupabase(page)
    await page.goto('/planilla/cas-general')
    await expect(page.getByText('GOMEZ ANA')).toBeVisible()

    await page.getByRole('button', { name: /Actualizar columna/i }).click()
    const dialog = page.locator('.fixed.inset-0')
    await dialog.getByRole('combobox').selectOption('r_basica')

    const buffer = excelBuffer([{ DNI: 888, 'R. Básica': 10 }])
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      dialog.getByRole('button', { name: /Subir Excel/i }).click(),
    ])
    await chooser.setFiles({
      name: 'datos.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    })

    const confirmar = dialog.getByRole('button', { name: /Confirmar \(0\)/i })
    await expect(confirmar).toBeVisible()
    await expect(confirmar).toBeDisabled()
    expect(rpcCalls).toHaveLength(0)
  })
})
