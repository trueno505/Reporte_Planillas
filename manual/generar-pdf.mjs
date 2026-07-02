// Convierte manual-usuario.html → manual-usuario.pdf usando el Chromium que ya
// trae @playwright/test. Cada .page se imprime como una página A4 vertical
// gracias al @media print del HTML.
//
//   node manual/generar-pdf.mjs
//
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(__dirname, 'manual-usuario.html')
const pdfPath  = join(__dirname, 'manual-usuario.pdf')

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
  await page.emulateMedia({ media: 'print' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: false,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  console.log('PDF generado:', pdfPath)
} finally {
  await browser.close()
}
