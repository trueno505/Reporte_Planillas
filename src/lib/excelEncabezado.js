import XLSX from 'xlsx-js-style'
import { formatPeriodo } from './periodo'

// Datos institucionales fijos, iguales para todas las planillas.
export const ENTIDAD = 'MUNICIPALIDAD PROVINCIAL DE ICA'
export const OFICINA = 'OFICINA DE GESTION DE RECURSOS HUMANOS'
export const AREA_REM = 'Area de Remuneraciones OGRRHH'
export const RUC = 'RUC 20142167744'

// Nº de filas de encabezado antes de la fila de etiquetas de columnas.
// [0]=entidad [1]=oficina [2]=area [3]=título [4]=mes [5]=(blanco) [6]=RUC
// [7]=etiquetas de columnas, [8+]=datos.
const FILA_TITULO = 3
const FILA_MES = 4
const FILA_RUC = 6
const FILA_COLUMNAS = 7

const AZUL = '0000CC'
const NEGRO = '000000'
const MAGENTA = 'CC0099'

// 'YYYY-MM-01' → "MARZO DEL 2026"
function mesLargo(periodo) {
  if (!periodo) return ''
  return formatPeriodo(periodo).toUpperCase().replace(' ', ' DEL ')
}

function ref(r, c) {
  return XLSX.utils.encode_cell({ r, c })
}

const borde = {
  top: { style: 'thin', color: { rgb: '999999' } },
  bottom: { style: 'thin', color: { rgb: '999999' } },
  left: { style: 'thin', color: { rgb: '999999' } },
  right: { style: 'thin', color: { rgb: '999999' } },
}

/**
 * Construye una hoja (worksheet) estilizada con el encabezado institucional, el
 * título propio de la planilla, el mes y el RUC, seguido de la fila de columnas
 * y los datos. Reutilizada por ExcelExport (individual) y reporteConsolidado.
 *
 * @param {Object} planilla - objeto de config (usa `columnas`, `titulo`/`label`)
 * @param {Array}  filas    - registros del mes (puede venir vacío)
 * @param {string|null} periodo - mes 'YYYY-MM-01' (null = sin línea de mes)
 * @returns worksheet listo para book_append_sheet
 */
export function construirHojaPlanilla(planilla, filas, periodo = null) {
  const columnas = planilla.columnas
  const nCols = columnas.length
  const titulo = planilla.titulo ?? planilla.label
  const ultima = nCols - 1

  // ─── Contenido (array de arrays) ───────────────────────────────────────────
  const aoa = [
    [ENTIDAD],
    [OFICINA],
    [AREA_REM],
    [titulo],
    [`CORRESPONDIENTE AL MES DE : ${mesLargo(periodo)}`],
    [],
    [],
    columnas.map((c) => c.label),
    ...(filas.length
      ? filas.map((fila) => columnas.map((c) => fila[c.key] ?? ''))
      : []),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // RUC en la última columna de su fila (alineado a la derecha).
  const celdaRuc = ref(FILA_RUC, ultima)
  ws[celdaRuc] = { t: 's', v: RUC }
  // Asegura que el rango de la hoja cubra la celda del RUC aunque no haya datos.
  const filasTotales = aoa.length
  ws['!ref'] = `A1:${ref(Math.max(filasTotales - 1, FILA_RUC), ultima)}`

  // ─── Combinaciones (merges) ────────────────────────────────────────────────
  const mitad = Math.max(Math.floor(nCols / 2), 1)
  ws['!merges'] = [
    { s: { r: FILA_TITULO, c: 0 }, e: { r: FILA_TITULO, c: ultima } }, // título
    { s: { r: FILA_MES, c: 0 }, e: { r: FILA_MES, c: mitad - 1 } },    // "MES DE :"
    { s: { r: FILA_MES, c: mitad }, e: { r: FILA_MES, c: ultima } },   // mes (magenta)
    { s: { r: FILA_RUC, c: Math.max(ultima - 3, 0) }, e: { r: FILA_RUC, c: ultima } },
  ]

  // La línea del mes se reparte en dos celdas para colorear solo el mes.
  ws[ref(FILA_MES, 0)] = { t: 's', v: 'CORRESPONDIENTE AL MES DE :' }
  ws[ref(FILA_MES, mitad)] = { t: 's', v: mesLargo(periodo) }

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const membrete = { font: { bold: true, color: { rgb: AZUL }, sz: 11 } }
  for (let r = 0; r <= 2; r++) {
    if (ws[ref(r, 0)]) ws[ref(r, 0)].s = membrete
  }
  ws[ref(FILA_TITULO, 0)].s = {
    font: { bold: true, color: { rgb: NEGRO }, sz: 14 },
    alignment: { horizontal: 'center', vertical: 'center' },
  }
  ws[ref(FILA_MES, 0)].s = {
    font: { bold: true, color: { rgb: NEGRO }, sz: 11 },
    alignment: { horizontal: 'right', vertical: 'center' },
  }
  ws[ref(FILA_MES, mitad)].s = {
    font: { bold: true, color: { rgb: MAGENTA }, sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
  ws[celdaRuc].s = {
    font: { bold: false, color: { rgb: NEGRO }, sz: 9 },
    alignment: { horizontal: 'right' },
  }

  // Fila de etiquetas de columnas: negrita azul + borde.
  for (let c = 0; c < nCols; c++) {
    const cell = ws[ref(FILA_COLUMNAS, c)]
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: AZUL }, sz: 9 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borde,
      }
    }
  }

  // Filas de datos: borde fino.
  for (let r = FILA_COLUMNAS + 1; r < filasTotales; r++) {
    for (let c = 0; c < nCols; c++) {
      const cell = ws[ref(r, c)]
      if (cell) cell.s = { font: { sz: 9 }, border: borde }
    }
  }

  // ─── Anchos de columna ─────────────────────────────────────────────────────
  ws['!cols'] = columnas.map((c) =>
    c.key === 'apellidos_y_nombres' ? { wch: 32 } : { wch: 14 }
  )

  return ws
}
