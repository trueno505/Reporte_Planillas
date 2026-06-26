import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/supabaseMock.js'

test('alta rápida global muestra "Tipo de acto administrativo" y lo exige', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/nuevo-registro')

  // Paso 1: grupo CAS (acotado a la sección del asistente, no al sidebar).
  const seccionGrupo = page.locator('section').filter({ hasText: '¿A qué grupo pertenece?' })
  await seccionGrupo.getByRole('button', { name: /CAS/ }).click()
  // Paso 2: planilla.
  const seccionPlanilla = page.locator('section').filter({ hasText: '¿En qué planilla' })
  await seccionPlanilla.getByRole('button', { name: 'CAS General' }).click()

  // Paso 3: el formulario rápido incluye el nuevo campo.
  const dialog = page.locator('.fixed.inset-0')
  await expect(dialog.getByText('Tipo de acto administrativo')).toBeVisible()

  await page.screenshot({ path: 'e2e/_nuevo_registro.png', fullPage: true })

  // Intentar guardar vacío → lo reporta como obligatorio.
  await dialog.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText(/Tipo de acto administrativo/i).last()).toBeVisible()
  await expect(page.getByText(/Faltan campos obligatorios/i)).toBeVisible()
})
