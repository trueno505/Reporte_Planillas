import XLSX from 'xlsx-js-style'
import { formatPeriodo } from './periodo'
import { getSeccionesCalculo } from '../config/planillas'

// Datos institucionales fijos, iguales para todas las planillas.
export const ENTIDAD = 'MUNICIPALIDAD PROVINCIAL DE ICA'
export const OFICINA = 'OFICINA DE GESTION DE RECURSOS HUMANOS'
export const AREA_REM = 'Area de Remuneraciones OGRRHH'
export const RUC = 'RUC 20142167744'

const AZUL = '0000CC'
const NEGRO = '000000'
const MAGENTA = 'CC0099'
const BLANCO = 'FFFFFF'
const AZUL_OSC = '003366'
const GRIS = 'EFEFEF'
const NUMFMT = '#,##0.00'

const borde = {
  top: { style: 'thin', color: { rgb: '999999' } },
  bottom: { style: 'thin', color: { rgb: '999999' } },
  left: { style: 'thin', color: { rgb: '999999' } },
  right: { style: 'thin', color: { rgb: '999999' } },
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function ref(r, c) {
  return XLSX.utils.encode_cell({ r, c })
}

// 'YYYY-MM-01' → "MARZO DEL 2026"
function mesLargo(periodo) {
  if (!periodo) return ''
  return formatPeriodo(periodo).toUpperCase().replace(' ', ' DEL ')
}

// Valor de celda tipado: money/int → número (para formato numérico), resto texto.
function valorCelda(col, fila) {
  const v = fila[col.key]
  if (v == null || v === '') return { t: 's', v: '' }
  if (col.type === 'money' || col.type === 'int') {
    const n = parseFloat(v)
    return isNaN(n) ? { t: 's', v: String(v) } : { t: 'n', v: n, z: col.type === 'money' ? NUMFMT : undefined }
  }
  return { t: 's', v: String(v) }
}

function sumaClave(rows, key) {
  return round2(rows.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0))
}

/**
 * Agrupa las filas por su columna `area`, en orden alfabético de las áreas
 * definidas en la planilla. Devuelve null si la planilla no tiene áreas.
 * Las filas sin área (o con un área no listada) se agrupan aparte.
 */
function agruparPorArea(planilla, filas) {
  if (!planilla.areas?.length) return null
  const orden = [...planilla.areas].sort((a, b) => a.localeCompare(b, 'es'))
  const map = new Map(orden.map((a) => [a, []]))
  const sinArea = []
  for (const f of filas) {
    const a = String(f.area ?? '').trim()
    if (!a) sinArea.push(f)
    else {
      if (!map.has(a)) map.set(a, [])
      map.get(a).push(f)
    }
  }
  const grupos = [...map.entries()]
    .filter(([, rows]) => rows.length > 0)
    .map(([area, rows]) => ({ area, rows }))
  if (sinArea.length) grupos.push({ area: '(SIN ÁREA)', rows: sinArea })
  return grupos
}

// ─── Estilos reutilizables ────────────────────────────────────────────────────
const stMembrete = { font: { bold: true, color: { rgb: AZUL }, sz: 11 } }
const stTitulo = {
  font: { bold: true, color: { rgb: NEGRO }, sz: 14 },
  alignment: { horizontal: 'center', vertical: 'center' },
}
const stMesLbl = {
  font: { bold: true, color: { rgb: NEGRO }, sz: 11 },
  alignment: { horizontal: 'right', vertical: 'center' },
}
const stMesVal = {
  font: { bold: true, color: { rgb: MAGENTA }, sz: 11 },
  alignment: { horizontal: 'left', vertical: 'center' },
}
const stRuc = { font: { color: { rgb: NEGRO }, sz: 9 }, alignment: { horizontal: 'right' } }
const stColLbl = {
  font: { bold: true, color: { rgb: AZUL }, sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: borde,
}
const stArea = {
  font: { bold: true, color: { rgb: BLANCO }, sz: 10 },
  fill: { fgColor: { rgb: AZUL_OSC } },
  alignment: { horizontal: 'left', vertical: 'center' },
}
const stSubtotal = {
  font: { bold: true, color: { rgb: NEGRO }, sz: 9 },
  fill: { fgColor: { rgb: GRIS } },
  border: borde,
}
const stResTit = { font: { bold: true, color: { rgb: AZUL_OSC }, sz: 10 } }
const stResHead = {
  font: { bold: true, color: { rgb: BLANCO }, sz: 9 },
  fill: { fgColor: { rgb: AZUL_OSC } },
  alignment: { horizontal: 'center' },
  border: borde,
}
const stResLbl = { font: { sz: 9 }, border: borde }
const stResVal = { font: { sz: 9 }, alignment: { horizontal: 'right' }, border: borde, z: NUMFMT }
const stResTot = {
  font: { bold: true, sz: 9 },
  fill: { fgColor: { rgb: GRIS } },
  border: borde,
}
const stResTotVal = {
  font: { bold: true, sz: 9 },
  fill: { fgColor: { rgb: GRIS } },
  alignment: { horizontal: 'right' },
  border: borde,
  z: NUMFMT,
}

// Escribe una celda con estilo. Combina `z` (numFmt) si el estilo lo trae.
function set(ws, r, c, cell, style) {
  const out = { ...cell }
  if (style) {
    out.s = style
    if (style.z && !out.z) out.z = style.z
  }
  ws[ref(r, c)] = out
}

/**
 * Escribe el bloque de encabezado institucional (membrete + título + mes + RUC)
 * en las filas 0..6 y devuelve el índice de la fila siguiente (7).
 */
function escribirEncabezado(ws, titulo, periodo, nCols, merges) {
  const ultima = nCols - 1
  set(ws, 0, 0, { t: 's', v: ENTIDAD }, stMembrete)
  set(ws, 1, 0, { t: 's', v: OFICINA }, stMembrete)
  set(ws, 2, 0, { t: 's', v: AREA_REM }, stMembrete)
  set(ws, 3, 0, { t: 's', v: titulo }, stTitulo)

  const mitad = Math.max(Math.floor(nCols / 2), 1)
  set(ws, 4, 0, { t: 's', v: 'CORRESPONDIENTE AL MES DE :' }, stMesLbl)
  set(ws, 4, mitad, { t: 's', v: mesLargo(periodo) }, stMesVal)
  set(ws, 6, ultima, { t: 's', v: RUC }, stRuc)

  merges.push(
    { s: { r: 3, c: 0 }, e: { r: 3, c: ultima } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: mitad - 1 } },
    { s: { r: 4, c: mitad }, e: { r: 4, c: ultima } },
    { s: { r: 6, c: Math.max(ultima - 3, 0) }, e: { r: 6, c: ultima } },
  )
  return 7
}

// Escribe el bloque "RESUMEN / COMPROBACIÓN" por concepto para un grupo de filas.
// Devuelve la fila siguiente libre.
function escribirResumenConcepto(ws, planilla, rows, r0, merges, tituloBloque) {
  const secciones = getSeccionesCalculo(planilla)
  if (!secciones) return r0
  const colMap = Object.fromEntries(planilla.columnas.map((c) => [c.key, c.label]))

  // Solo conceptos con suma != 0.
  const ingr = secciones.ingresoKeys
    .map((k) => ({ label: colMap[k] ?? k, monto: sumaClave(rows, k) }))
    .filter((x) => x.monto !== 0)
  const desc = secciones.descuentoKeys
    .map((k) => ({ label: colMap[k] ?? k, monto: sumaClave(rows, k) }))
    .filter((x) => x.monto !== 0)

  let r = r0
  set(ws, r, 0, { t: 's', v: tituloBloque }, stResTit)
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } })
  r += 1
  set(ws, r, 0, { t: 's', v: 'INGRESOS' }, stResHead)
  set(ws, r, 1, { t: 's', v: 'S/' }, stResHead)
  set(ws, r, 3, { t: 's', v: 'DESCUENTOS' }, stResHead)
  set(ws, r, 4, { t: 's', v: 'S/' }, stResHead)
  r += 1

  const filas = Math.max(ingr.length, desc.length)
  for (let i = 0; i < filas; i++) {
    if (ingr[i]) {
      set(ws, r + i, 0, { t: 's', v: ingr[i].label }, stResLbl)
      set(ws, r + i, 1, { t: 'n', v: ingr[i].monto }, stResVal)
    }
    if (desc[i]) {
      set(ws, r + i, 3, { t: 's', v: desc[i].label }, stResLbl)
      set(ws, r + i, 4, { t: 'n', v: desc[i].monto }, stResVal)
    }
  }
  r += filas

  const totIngr = sumaClave(rows, secciones.totalIngreso)
  const totDesc = sumaClave(rows, secciones.totalDscto)
  const totLiq = round2(totIngr - totDesc)
  set(ws, r, 0, { t: 's', v: 'TOTAL INGRESOS' }, stResTot)
  set(ws, r, 1, { t: 'n', v: totIngr }, stResTotVal)
  set(ws, r, 3, { t: 's', v: 'TOTAL DESCUENTOS' }, stResTot)
  set(ws, r, 4, { t: 'n', v: totDesc }, stResTotVal)
  r += 1
  set(ws, r, 0, { t: 's', v: 'TOTAL LÍQUIDO' }, stResTot)
  set(ws, r, 1, { t: 'n', v: totLiq }, stResTotVal)
  r += 1
  return r
}

/**
 * Construye una hoja estilizada con el encabezado institucional, y los datos
 * agrupados por área (subtítulo + filas + subtotal + resumen por concepto) para
 * las planillas con áreas. Las planillas sin áreas salen como una tabla simple.
 *
 * @param {Object} planilla - objeto de config (usa `columnas`, `titulo`, `areas`)
 * @param {Array}  filas    - registros del mes (puede venir vacío)
 * @param {string|null} periodo - mes 'YYYY-MM-01'
 */
export function construirHojaPlanilla(planilla, filas, periodo = null) {
  const columnas = planilla.columnas
  const nCols = columnas.length
  const ultima = nCols - 1
  const titulo = planilla.titulo ?? planilla.label
  const ws = {}
  const merges = []

  let r = escribirEncabezado(ws, titulo, periodo, nCols, merges)

  // Fila de etiquetas de columnas.
  columnas.forEach((c, i) => set(ws, r, i, { t: 's', v: c.label }, stColLbl))
  r += 1

  const moneyCols = columnas
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.type === 'money')

  const escribirFilas = (rows) => {
    for (const fila of rows) {
      columnas.forEach((c, i) => set(ws, r, i, valorCelda(c, fila), stResLbl))
      r += 1
    }
  }
  const escribirSubtotal = (rows, etiqueta) => {
    // Etiqueta en la 2ª columna (apellidos) y sumas bajo cada columna money.
    set(ws, r, 0, { t: 's', v: etiqueta }, stSubtotal)
    if (nCols > 1) set(ws, r, 1, { t: 's', v: '' }, stSubtotal)
    for (const { c, i } of moneyCols) {
      set(ws, r, i, { t: 'n', v: sumaClave(rows, c.key) }, { ...stSubtotal, z: NUMFMT })
    }
    r += 1
  }

  const grupos = agruparPorArea(planilla, filas)

  if (!grupos) {
    // Planilla sin áreas: tabla simple.
    escribirFilas(filas)
  } else {
    for (const { area, rows } of grupos) {
      set(ws, r, 0, { t: 's', v: `ÁREA: ${area}` }, stArea)
      merges.push({ s: { r, c: 0 }, e: { r, c: ultima } })
      r += 1
      escribirFilas(rows)
      escribirSubtotal(rows, `SUBTOTAL ${area}`)
      r += 1 // separador
      r = escribirResumenConcepto(ws, planilla, rows, r, merges, `RESUMEN DEL ÁREA: ${area}`)
      r += 2 // separación entre áreas
    }
  }

  // Rango y anchos.
  const maxRow = Math.max(r, 7)
  ws['!ref'] = `A1:${ref(maxRow, ultima)}`
  ws['!merges'] = merges
  ws['!cols'] = columnas.map((c) =>
    c.key === 'apellidos_y_nombres' ? { wch: 32 } : { wch: 14 },
  )
  return ws
}

/**
 * Construye la hoja "Resumen por áreas": una fila por área con Total Ingreso,
 * Total Descuento, Total Líquido y N° de trabajadores, más un total general.
 * Devuelve null si la planilla no tiene áreas o no admite auto-totales.
 */
export function construirHojaResumenAreas(planilla, filas, periodo = null) {
  const grupos = agruparPorArea(planilla, filas)
  const secciones = getSeccionesCalculo(planilla)
  if (!grupos || !secciones) return null

  const NCOLS = 5 // Área | Ingresos | Descuentos | Líquido | N° Trab.
  const ws = {}
  const merges = []
  let r = escribirEncabezado(ws, `${planilla.titulo ?? planilla.label} — RESUMEN POR ÁREAS`, periodo, NCOLS, merges)

  const heads = ['ÁREA', 'TOTAL INGRESOS', 'TOTAL DESCUENTOS', 'TOTAL LÍQUIDO', 'N° TRAB.']
  heads.forEach((h, i) => set(ws, r, i, { t: 's', v: h }, stResHead))
  r += 1

  let gi = 0, gd = 0, gn = 0
  for (const { area, rows } of grupos) {
    const ti = sumaClave(rows, secciones.totalIngreso)
    const td = sumaClave(rows, secciones.totalDscto)
    const tl = round2(ti - td)
    set(ws, r, 0, { t: 's', v: area }, stResLbl)
    set(ws, r, 1, { t: 'n', v: ti }, stResVal)
    set(ws, r, 2, { t: 'n', v: td }, stResVal)
    set(ws, r, 3, { t: 'n', v: tl }, stResVal)
    set(ws, r, 4, { t: 'n', v: rows.length }, { ...stResLbl, alignment: { horizontal: 'center' } })
    gi += ti; gd += td; gn += rows.length
    r += 1
  }
  set(ws, r, 0, { t: 's', v: 'TOTAL GENERAL' }, stResTot)
  set(ws, r, 1, { t: 'n', v: round2(gi) }, stResTotVal)
  set(ws, r, 2, { t: 'n', v: round2(gd) }, stResTotVal)
  set(ws, r, 3, { t: 'n', v: round2(gi - gd) }, stResTotVal)
  set(ws, r, 4, { t: 'n', v: gn }, { ...stResTot, alignment: { horizontal: 'center' } })

  ws['!ref'] = `A1:${ref(r, NCOLS - 1)}`
  ws['!merges'] = merges
  ws['!cols'] = [{ wch: 45 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }]
  return ws
}
