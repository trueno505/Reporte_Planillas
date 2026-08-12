// Renderiza docs/pitch/pitch.html a PDF con Chromium.
//   node scripts/generar-pitch-pdf.mjs

import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { statSync } from 'node:fs'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HTML = resolve(RAIZ, 'docs/pitch/pitch.html')
const PDF = resolve(RAIZ, 'docs/pitch/Muni-Sheets-Presentacion.pdf')

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' })
// Asegura que las capturas estén decodificadas antes de imprimir.
await page.evaluate(() => Promise.all(
  [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))
))

await page.pdf({
  path: PDF,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
})

await browser.close()

const kb = (statSync(PDF).size / 1024).toFixed(0)
console.log(`PDF generado: docs/pitch/Muni-Sheets-Presentacion.pdf (${kb} KB)`)
