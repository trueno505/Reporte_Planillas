import XLSX from 'xlsx-js-style'
import { formatPeriodo } from './periodo'
import { getSeccionesCalculo } from '../config/planillas'
import { getCuadroArea } from '../config/cuadrosPresupuestales'

// Cuota patronal ESSALUD: 9% del total de ingresos.
const TASA_ESSALUD = 0.09
const LBL_ESSALUD = 'A ESSALUD (IPSS) (CAJA DE ENFERM. Y MATERNIDAD)'

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

// ─── Cuadro presupuestal ─────────────────────────────────────────────────────
const stCuaLbl = { font: { bold: true, sz: 9 }, border: borde }
const stCuaVal = { font: { sz: 9 }, border: borde }
const stCuaCen = { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: borde }
const stCuaSiaf = { font: { bold: true, color: { rgb: AZUL }, sz: 9 }, border: borde }

/**
 * Escribe el cuadro presupuestal de un área a partir de `c0`. Los datos fijos
 * salen de cuadrosPresupuestales.js; el Nº Siaf lo aporta el usuario y las
 * celdas de montos/fecha quedan vacías para llenarse a mano.
 * Devuelve la fila siguiente libre.
 */
function escribirCuadroPresupuestal(ws, cuadro, siaf, periodo, r0, c0, merges) {
  if (!cuadro) return r0
  const anio = periodo ? String(periodo).slice(0, 4) : String(new Date().getFullYear())
  const nMontos = cuadro.rubros?.length ?? 3
  const cTot = c0 + 1 + nMontos // columna TOTAL del cuadro
  let r = r0

  const filaTitulo = (texto) => {
    set(ws, r, c0, { t: 's', v: texto }, stCuaLbl)
    merges.push({ s: { r, c: c0 }, e: { r, c: cTot } })
    r += 1
  }
  filaTitulo(ENTIDAD)
  filaTitulo(cuadro.oficina ?? OFICINA)
  filaTitulo(`EJERCICIO PRESUPUESTAL ${anio}`)

  set(ws, r, c0, { t: 's', v: 'Nº Siaf' }, stCuaLbl)
  set(ws, r, c0 + 1, { t: 's', v: siaf ? String(siaf) : '' }, stCuaSiaf)
  r += 1

  for (const [lbl, val, extra] of cuadro.campos) {
    set(ws, r, c0, { t: 's', v: lbl ?? '' }, stCuaLbl)
    set(ws, r, c0 + 1, { t: 's', v: val ?? '' }, stCuaCen)
    if (extra) set(ws, r, c0 + 2, { t: 's', v: extra }, stCuaVal)
    r += 1
  }
  r += 1 // separación antes de fuentes/clasificadores

  if (cuadro.fuentes?.length) {
    set(ws, r, c0, { t: 's', v: 'Fte.Financ.' }, stCuaLbl)
    cuadro.fuentes.forEach((f, i) => set(ws, r, c0 + 1 + i, { t: 's', v: f }, stCuaCen))
    r += 1
  }
  if (cuadro.rubros?.length) {
    set(ws, r, c0, { t: 's', v: 'Rubro' }, stCuaLbl)
    cuadro.rubros.forEach((v, i) => set(ws, r, c0 + 1 + i, { t: 's', v: v }, stCuaCen))
    r += 1
  }

  set(ws, r, c0, { t: 's', v: 'Clasificador' }, stCuaLbl)
  for (let i = 0; i < nMontos; i++) set(ws, r, c0 + 1 + i, { t: 's', v: 'Monto' }, { ...stCuaLbl, alignment: { horizontal: 'center' } })
  set(ws, r, cTot, { t: 's', v: 'TOTAL' }, { ...stCuaLbl, alignment: { horizontal: 'center' } })
  r += 1

  const filaVacia = (etiqueta, st) => {
    set(ws, r, c0, { t: 's', v: etiqueta }, st)
    for (let c = c0 + 1; c <= cTot; c++) set(ws, r, c, { t: 's', v: '' }, stCuaVal)
    r += 1
  }
  for (const codigo of cuadro.clasificadores) filaVacia(codigo, stCuaVal)
  filaVacia('TOTAL', stCuaLbl)

  // FECHA: se autocompleta con el día en que se descarga el Excel (dd/mm/aaaa).
  const hoy = new Date()
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
  set(ws, r, c0, { t: 's', v: 'FECHA:' }, stCuaLbl)
  set(ws, r, c0 + 1, { t: 's', v: fecha }, stCuaCen)
  for (let c = c0 + 2; c <= cTot; c++) set(ws, r, c, { t: 's', v: '' }, stCuaVal)
  r += 1
  return r
}

// Columna donde arranca el cuadro presupuestal, a la derecha del resumen.
const COL_CUADRO = 6

/**
 * Escribe el bloque completo de un área: RESÚMEN de ingresos por concepto
 * (+ sección A ESSALUD = 9% del total de ingresos), COMPROBACIÓN (líquido +
 * retenciones + cuota patronal) y, a la derecha, el cuadro presupuestal.
 * Devuelve la fila siguiente libre.
 */
function escribirBloqueArea(ws, planilla, rows, r0, merges, area, siaf, periodo) {
  const secciones = getSeccionesCalculo(planilla)
  const cuadro = getCuadroArea(planilla.slug, area)
  if (!secciones && !cuadro) return r0

  let r = r0
  if (area) {
    set(ws, r, 0, { t: 's', v: `RESUMEN DEL ÁREA: ${area}` }, stResTit)
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } })
    r += 1
  }

  let rIzq = r
  let rDer = r
  if (secciones) {
    const colMap = Object.fromEntries(planilla.columnas.map((c) => [c.key, c.label]))
    // Solo conceptos con suma != 0.
    const ingr = secciones.ingresoKeys
      .map((k) => ({ label: colMap[k] ?? k, monto: sumaClave(rows, k) }))
      .filter((x) => x.monto !== 0)
    const desc = secciones.descuentoKeys
      .map((k) => ({ label: colMap[k] ?? k, monto: sumaClave(rows, k) }))
      .filter((x) => x.monto !== 0)

    const totIngr = sumaClave(rows, secciones.totalIngreso)
    const totDesc = sumaClave(rows, secciones.totalDscto)
    const totLiq = round2(totIngr - totDesc)
    const essalud = round2(totIngr * TASA_ESSALUD)

    // ── Bloque izquierdo: RESÚMEN de ingresos + ESSALUD ──
    set(ws, rIzq, 0, { t: 's', v: 'RESÚMEN' }, stResHead)
    set(ws, rIzq, 1, { t: 's', v: 'S/' }, stResHead)
    rIzq += 1
    for (const x of ingr) {
      set(ws, rIzq, 0, { t: 's', v: x.label }, stResLbl)
      set(ws, rIzq, 1, { t: 'n', v: x.monto }, stResVal)
      rIzq += 1
    }
    set(ws, rIzq, 0, { t: 's', v: 'TOTAL INGRESOS' }, stResTot)
    set(ws, rIzq, 1, { t: 'n', v: totIngr }, stResTotVal)
    rIzq += 2 // sección un poco separada
    set(ws, rIzq, 0, { t: 's', v: LBL_ESSALUD }, stResLbl)
    set(ws, rIzq, 1, { t: 'n', v: essalud }, stResVal)
    rIzq += 1
    set(ws, rIzq, 0, { t: 's', v: 'TOTAL' }, stResTot)
    set(ws, rIzq, 1, { t: 'n', v: round2(totIngr + essalud) }, stResTotVal)
    rIzq += 1

    // ── Bloque derecho: COMPROBACIÓN ──
    set(ws, rDer, 3, { t: 's', v: 'COMPROBACIÓN' }, stResHead)
    set(ws, rDer, 4, { t: 's', v: 'S/' }, stResHead)
    rDer += 1
    set(ws, rDer, 3, { t: 's', v: 'TOTAL LÍQUIDO' }, stResLbl)
    set(ws, rDer, 4, { t: 'n', v: totLiq }, stResVal)
    rDer += 1
    set(ws, rDer, 3, { t: 's', v: 'RETENCIONES' }, stResTot)
    rDer += 1
    for (const x of desc) {
      set(ws, rDer, 3, { t: 's', v: x.label }, stResLbl)
      set(ws, rDer, 4, { t: 'n', v: x.monto }, stResVal)
      rDer += 1
    }
    set(ws, rDer, 3, { t: 's', v: 'TOTAL RETENCIONES' }, stResTot)
    set(ws, rDer, 4, { t: 'n', v: totDesc }, stResTotVal)
    rDer += 1
    set(ws, rDer, 3, { t: 's', v: 'CUOTA PATRONAL' }, stResLbl)
    set(ws, rDer, 4, { t: 'n', v: essalud }, stResVal)
    rDer += 1
    set(ws, rDer, 3, { t: 's', v: 'TOTAL' }, stResTot)
    set(ws, rDer, 4, { t: 'n', v: round2(totLiq + totDesc + essalud) }, stResTotVal)
    rDer += 1
  }

  const rCua = escribirCuadroPresupuestal(ws, cuadro, siaf, periodo, r, COL_CUADRO, merges)
  return Math.max(rIzq, rDer, rCua)
}

/**
 * Construye una hoja estilizada con el encabezado institucional, y los datos
 * agrupados por área (subtítulo + filas + subtotal + resumen por concepto) para
 * las planillas con áreas. Las planillas sin áreas salen como una tabla simple.
 *
 * @param {Object} planilla - objeto de config (usa `columnas`, `titulo`, `areas`)
 * @param {Array}  filas    - registros del mes (puede venir vacío)
 * @param {string|null} periodo - mes 'YYYY-MM-01'
 * @param {Object} siafPorArea - Nº Siaf por área (clave '*' para planillas sin áreas)
 */
export function construirHojaPlanilla(planilla, filas, periodo = null, siafPorArea = {}) {
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
    // Planilla sin áreas: tabla simple + resumen/cuadro general al final.
    escribirFilas(filas)
    if (filas.length) {
      escribirSubtotal(filas, 'TOTAL GENERAL')
      r += 1 // separador
      r = escribirBloqueArea(ws, planilla, filas, r, merges, null, siafPorArea['*'] ?? '', periodo)
    }
  } else {
    for (const { area, rows } of grupos) {
      set(ws, r, 0, { t: 's', v: `ÁREA: ${area}` }, stArea)
      merges.push({ s: { r, c: 0 }, e: { r, c: ultima } })
      r += 1
      escribirFilas(rows)
      escribirSubtotal(rows, `SUBTOTAL ${area}`)
      r += 1 // separador
      r = escribirBloqueArea(ws, planilla, rows, r, merges, area, siafPorArea[area] ?? '', periodo)
      r += 2 // separación entre áreas
    }
  }

  // Rango y anchos (el cuadro presupuestal puede sobresalir a la derecha en
  // planillas con pocas columnas).
  const maxRow = Math.max(r, 7)
  const maxCol = Math.max(ultima, COL_CUADRO + 6)
  ws['!ref'] = `A1:${ref(maxRow, maxCol)}`
  ws['!merges'] = merges
  ws['!cols'] = columnas.map((c) =>
    c.key === 'apellidos_y_nombres' ? { wch: 32 } : { wch: 14 },
  )
  return ws
}

/**
 * Construye la hoja "Resumen por áreas": una fila por área con TODAS las
 * columnas de montos de la planilla (cada concepto de ingreso y descuento,
 * más los totales) y una fila TOTAL GENERAL que suma cada columna al final.
 * Devuelve null si la planilla no tiene áreas.
 */
export function construirHojaResumenAreas(planilla, filas, periodo = null) {
  const grupos = agruparPorArea(planilla, filas)
  if (!grupos) return null

  const moneyCols = planilla.columnas.filter((c) => c.type === 'money')
  const NCOLS = 1 + moneyCols.length + 1 // Área | conceptos… | N° Trab.
  const ws = {}
  const merges = []
  let r = escribirEncabezado(ws, `${planilla.titulo ?? planilla.label} — RESUMEN POR ÁREAS`, periodo, NCOLS, merges)

  set(ws, r, 0, { t: 's', v: 'ÁREA' }, stResHead)
  moneyCols.forEach((c, i) => set(ws, r, 1 + i, { t: 's', v: c.label }, { ...stResHead, alignment: { horizontal: 'center', wrapText: true } }))
  set(ws, r, NCOLS - 1, { t: 's', v: 'N° TRAB.' }, stResHead)
  r += 1

  const granTotal = new Array(moneyCols.length).fill(0)
  let gn = 0
  for (const { area, rows } of grupos) {
    set(ws, r, 0, { t: 's', v: area }, stResLbl)
    moneyCols.forEach((c, i) => {
      const s = sumaClave(rows, c.key)
      granTotal[i] += s
      set(ws, r, 1 + i, { t: 'n', v: s }, stResVal)
    })
    set(ws, r, NCOLS - 1, { t: 'n', v: rows.length }, { ...stResLbl, alignment: { horizontal: 'center' } })
    gn += rows.length
    r += 1
  }
  set(ws, r, 0, { t: 's', v: 'TOTAL GENERAL' }, stResTot)
  moneyCols.forEach((_, i) => set(ws, r, 1 + i, { t: 'n', v: round2(granTotal[i]) }, stResTotVal))
  set(ws, r, NCOLS - 1, { t: 'n', v: gn }, { ...stResTot, alignment: { horizontal: 'center' } })

  ws['!ref'] = `A1:${ref(r, NCOLS - 1)}`
  ws['!merges'] = merges
  ws['!cols'] = [{ wch: 45 }, ...moneyCols.map(() => ({ wch: 14 })), { wch: 10 }]
  return ws
}
