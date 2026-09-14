import XLSX from 'xlsx-js-style'

// Configuración de impresión de los Excel descargados.
//
// Sin ella la hoja salía vertical, al 100 % y con márgenes anchos: al imprimir
// "ajustar todas las columnas en una página" Excel encogía la planilla entera
// y los nombres quedaban diminutos. La planilla de referencia de la oficina
// (2-Alcalde -Julio-2026.xls) va horizontal, A4, ajustada a 1 página de ancho,
// centrada y repitiendo el encabezado en cada hoja.
//
// xlsx-js-style escribe los márgenes (`!margins`) y los nombres definidos
// (`Print_Titles`), pero NO `<pageSetup>` ni `<pageSetUpPr fitToPage>`. Por eso
// el libro se genera en memoria y se retoca el XML de cada hoja dentro del zip
// (con el CFB que ya trae la propia librería) antes de descargarlo.

const CLAVE = '!impresion'

const MARGENES = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }

/**
 * Marca la hoja para imprimirse ajustada a 1 página de ancho (A4).
 * @param {object} ws
 * @param {{ horizontal?: boolean, filasTitulo?: number }} opciones
 *   `filasTitulo`: nº de filas superiores que se repiten en cada página (0 = ninguna).
 */
export function configurarImpresion(ws, { horizontal = true, filasTitulo = 0 } = {}) {
  ws['!margins'] = { ...MARGENES }
  ws[CLAVE] = { horizontal, filasTitulo }
  return ws
}

/** Inserta en el XML de una hoja el ajuste a página, la orientación y el centrado. */
export function aplicarImpresionXml(xml, { horizontal = true } = {}) {
  let out = xml

  // <sheetPr> va primero dentro de <worksheet>; pageSetUpPr es su último hijo.
  const pr = '<pageSetUpPr fitToPage="1"/>'
  if (/<sheetPr\b[^>]*\/>/.test(out)) out = out.replace(/<sheetPr\b([^>]*)\/>/, `<sheetPr$1>${pr}</sheetPr>`)
  else if (out.includes('</sheetPr>')) out = out.replace('</sheetPr>', `${pr}</sheetPr>`)
  else out = out.replace(/(<worksheet\b[^>]*>)/, `$1<sheetPr>${pr}</sheetPr>`)

  // Orden del esquema: printOptions → pageMargins → pageSetup.
  const setup =
    `<pageSetup paperSize="9" orientation="${horizontal ? 'landscape' : 'portrait'}" ` +
    'fitToWidth="1" fitToHeight="0"/>'
  out = out.replace(/(<pageMargins\b[^>]*\/>)/, `<printOptions horizontalCentered="1"/>$1${setup}`)
  return out
}

/** Genera el .xlsx en memoria con la configuración de impresión aplicada. */
export function generarLibroImprimible(wb) {
  // Filas de título repetidas en cada página (una por hoja marcada).
  const nombres = (wb.Workbook?.Names ?? []).filter((n) => n.Name !== '_xlnm.Print_Titles')
  wb.SheetNames.forEach((nombre, i) => {
    const cfg = wb.Sheets[nombre][CLAVE]
    if (cfg?.filasTitulo > 0) {
      nombres.push({
        Name: '_xlnm.Print_Titles',
        Sheet: i,
        Ref: `'${nombre.replace(/'/g, "''")}'!$1:$${cfg.filasTitulo}`,
      })
    }
  })
  wb.Workbook = { ...(wb.Workbook ?? {}), Names: nombres }

  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const zip = XLSX.CFB.read(new Uint8Array(data), { type: 'array' })

  let tocado = false
  wb.SheetNames.forEach((nombre, i) => {
    const cfg = wb.Sheets[nombre][CLAVE]
    if (!cfg) return
    // La librería numera los archivos de hoja en el orden de SheetNames.
    const idx = zip.FullPaths.findIndex((p) => p.endsWith(`/xl/worksheets/sheet${i + 1}.xml`))
    if (idx === -1) return
    const archivo = zip.FileIndex[idx]
    const xml = new TextDecoder().decode(archivo.content)
    archivo.content = new TextEncoder().encode(aplicarImpresionXml(xml, cfg))
    archivo.size = archivo.content.length
    tocado = true
  })

  return tocado ? XLSX.CFB.write(zip, { type: 'array', fileType: 'zip' }) : data
}

/** Genera el libro imprimible y lo descarga con `nombreArchivo`. */
export function descargarLibroImprimible(wb, nombreArchivo) {
  const bytes = generarLibroImprimible(wb)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
