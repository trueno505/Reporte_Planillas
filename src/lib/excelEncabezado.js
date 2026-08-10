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
const stFilaLbl = { font: { bold: true, sz: 9 }, border: borde }
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
  // Las filas ya salen agrupadas bajo su banda "ÁREA: …", así que la columna
  // 'area' por trabajador es redundante y se excluye de la hoja.
  const columnas = planilla.areas?.length
    ? planilla.columnas.filter((c) => c.key !== 'area')
    : planilla.columnas

  // Cada trabajador ocupa varias filas: IDENTIDAD (DNI, nombre, fecha, cargo…
  // — todo lo que no sea columna money y esté antes de T. Ingreso), INGRES.
  // (T. Ingreso + las columnas money anteriores a él), DSCTOS (T. Dsctos, T.
  // Líquido y todo lo que va después de T. Ingreso) y, si la planilla tiene
  // `tipo_acto_administrativo`, OBSERVAC. con ese texto combinado en el resto
  // de la fila. Las columnas de INGRES. y DSCTOS reutilizan el MISMO rango de
  // columnas (una fila debajo de la otra) en vez de ir una a continuación de
  // la otra, para no ensanchar la hoja; por eso el encabezado también sale en
  // 2 filas: una con los conceptos de ingreso (para leer junto a INGRES.) y
  // otra con los de descuento (para leer junto a DSCTOS).
  const idxIngreso = columnas.findIndex((c) => c.key === 't_ingreso')
  const idxObs = columnas.findIndex((c) => c.key === 'tipo_acto_administrativo')

  // Planillas sin T. Ingreso (totales manuales, `sinAutoTotales`): sin
  // compactar ni dividir filas, como una tabla simple de siempre.
  const identidadCols = idxIngreso === -1 ? columnas : columnas.filter((c, i) => i <= idxIngreso && c.type !== 'money')
  const ingresoCols = idxIngreso === -1 ? [] : columnas.filter((c, i) => i <= idxIngreso && c.type === 'money')
  const descuentoColsAll = idxIngreso === -1 ? [] : columnas.filter((c, i) => i > idxIngreso && c.key !== 'tipo_acto_administrativo')

  // Total Líquido (y cualquier columna que venga después, p.ej. Firma) no
  // tiene par en Ingresos: se reservan sus propias columnas al final del
  // rango compartido, fusionadas verticalmente entre la fila INGRES. y la
  // fila DSCTOS, en vez de competir por posición con el resto de conceptos
  // de descuento.
  const idxLiquido = descuentoColsAll.findIndex((c) => c.key === 't_liquido')
  const reservadas = idxLiquido === -1 ? [] : descuentoColsAll.slice(idxLiquido)
  const descuentoCols = idxLiquido === -1 ? descuentoColsAll : descuentoColsAll.slice(0, idxLiquido)

  const nIdent = identidadCols.length
  const nMoneyBase = Math.max(ingresoCols.length, descuentoCols.length)
  const nMoney = nMoneyBase + reservadas.length
  // La lista más corta (Ingresos o Descuentos) se alinea por la derecha
  // contra la más larga, de modo que Total Ingreso y Total Descuentos
  // —siempre el último concepto de cada lista— terminan en la misma columna.
  // Cuando Descuentos es la lista larga (el caso normal), el hueco que sobra
  // a la izquierda de Ingresos se cubre "prestando" las últimas columnas de
  // identidad (Cargo, Niv. Rem., S.N.P., …): su rótulo no necesita repetirse
  // en las 2 filas del encabezado, así que la fila de abajo (DSCTOS) se
  // reutiliza ahí para los primeros conceptos de descuento, angostando la
  // hoja en vez de dejar celdas vacías. Si en cambio Ingresos es la lista
  // larga, no hay nada que prestar (la fila de arriba ya la ocupa identidad).
  const gap = nMoneyBase - Math.min(ingresoCols.length, descuentoCols.length)
  const prestadas = descuentoCols.length >= ingresoCols.length ? Math.min(nIdent, gap) : 0
  const base = nIdent - prestadas
  const offIngreso = nMoneyBase - ingresoCols.length
  const offDescuento = nMoneyBase - descuentoCols.length
  const colReservada = (k) => base + nMoneyBase + k
  const nCols = idxIngreso === -1 ? columnas.length : base + nMoney
  const ultima = Math.max(nCols - 1, 0)
  const titulo = planilla.titulo ?? planilla.label
  const ws = {}
  const merges = []

  let r = escribirEncabezado(ws, titulo, periodo, nCols, merges)

  if (idxIngreso === -1) {
    columnas.forEach((c, i) => set(ws, r, i, { t: 's', v: c.label }, stColLbl))
    r += 1
  } else {
    // Encabezado en 2 filas: la de arriba trae identidad + conceptos de
    // ingreso (termina en Total Ingreso, corresponde a la fila INGRES.); la
    // de abajo repite el mismo rango de columnas con los conceptos de
    // descuento (corresponde a la fila DSCTOS). Como la identidad no cambia
    // entre una y otra, sus celdas de encabezado se combinan verticalmente
    // (ocupan las 2 filas) en vez de dejar la fila de abajo vacía debajo.
    const rDesc = r + 1
    identidadCols.forEach((c, i) => {
      set(ws, r, i, { t: 's', v: c.label }, stColLbl)
      // Las últimas `prestadas` columnas de identidad no se fusionan: su fila
      // de abajo se reutiliza para los primeros conceptos de la lista larga.
      if (i < base) merges.push({ s: { r, c: i }, e: { r: rDesc, c: i } })
    })
    ingresoCols.forEach((c, i) => set(ws, r, base + offIngreso + i, { t: 's', v: c.label }, stColLbl))
    descuentoCols.forEach((c, i) => set(ws, rDesc, base + offDescuento + i, { t: 's', v: c.label }, stColLbl))
    reservadas.forEach((c, k) => {
      const col = colReservada(k)
      set(ws, r, col, { t: 's', v: c.label }, stColLbl)
      merges.push({ s: { r, c: col }, e: { r: rDesc, c: col } })
    })
    r += 2
  }

  const escribirFilas = (rows) => {
    for (const fila of rows) {
      if (idxIngreso === -1) {
        // Planilla sin T. Ingreso (totales manuales): sin split, como antes.
        columnas.forEach((c, i) => set(ws, r, i, valorCelda(c, fila), stResLbl))
        r += 1
        continue
      }

      // Fila IDENTIDAD
      identidadCols.forEach((c, i) => set(ws, r, i, valorCelda(c, fila), stResLbl))
      r += 1

      // Fila INGRES.
      const rIngres = r
      set(ws, r, 0, { t: 's', v: 'INGRES.' }, stFilaLbl)
      ingresoCols.forEach((c, i) => set(ws, r, base + offIngreso + i, valorCelda(c, fila), stResLbl))
      reservadas.forEach((c, k) => set(ws, r, colReservada(k), valorCelda(c, fila), stResLbl))
      r += 1

      // Fila DSCTOS
      set(ws, r, 0, { t: 's', v: 'DSCTOS' }, stFilaLbl)
      descuentoCols.forEach((c, i) => set(ws, r, base + offDescuento + i, valorCelda(c, fila), stResLbl))
      reservadas.forEach((c, k) => merges.push({ s: { r: rIngres, c: colReservada(k) }, e: { r, c: colReservada(k) } }))
      r += 1

      // Fila OBSERVAC. (tipo de acto administrativo), combinada en el resto.
      if (idxObs !== -1) {
        set(ws, r, 0, { t: 's', v: 'OBSERVAC.:' }, stFilaLbl)
        set(ws, r, 1, { t: 's', v: fila.tipo_acto_administrativo ?? '' }, stResLbl)
        if (ultima > 1) merges.push({ s: { r, c: 1 }, e: { r, c: ultima } })
        r += 1
      }
    }
  }
  const escribirSubtotal = (rows, etiqueta) => {
    if (idxIngreso === -1) {
      set(ws, r, 0, { t: 's', v: etiqueta }, stSubtotal)
      if (nCols > 1) set(ws, r, 1, { t: 's', v: '' }, stSubtotal)
      columnas.forEach((c, i) => {
        if (c.type === 'money') set(ws, r, i, { t: 'n', v: sumaClave(rows, c.key) }, { ...stSubtotal, z: NUMFMT })
      })
      r += 1
      return
    }
    // Subtotal en 2 filas, alineado con INGRES./DSCTOS de cada trabajador.
    const rIngresos = r
    set(ws, r, 0, { t: 's', v: `${etiqueta} - INGRESOS` }, stSubtotal)
    ingresoCols.forEach((c, i) => set(ws, r, base + offIngreso + i, { t: 'n', v: sumaClave(rows, c.key) }, { ...stSubtotal, z: NUMFMT }))
    reservadas.forEach((c, k) => {
      if (c.type === 'money') set(ws, r, colReservada(k), { t: 'n', v: sumaClave(rows, c.key) }, { ...stSubtotal, z: NUMFMT })
    })
    r += 1
    set(ws, r, 0, { t: 's', v: `${etiqueta} - DSCTOS` }, stSubtotal)
    descuentoCols.forEach((c, i) => {
      if (c.type === 'money') set(ws, r, base + offDescuento + i, { t: 'n', v: sumaClave(rows, c.key) }, { ...stSubtotal, z: NUMFMT })
    })
    reservadas.forEach((c, k) => merges.push({ s: { r: rIngresos, c: colReservada(k) }, e: { r, c: colReservada(k) } }))
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
  ws['!cols'] = idxIngreso === -1
    ? columnas.map((c) => (c.key === 'apellidos_y_nombres' ? { wch: 32 } : { wch: 14 }))
    : Array.from({ length: nCols }, (_, i) =>
        identidadCols[i]?.key === 'apellidos_y_nombres' ? { wch: 32 } : { wch: 14 },
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
