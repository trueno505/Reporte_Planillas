import XLSX from 'xlsx-js-style'
import { fetchAllRows } from './db'
import { PLANILLAS } from '../config/planillas'
import { formatPeriodo } from './periodo'
import { construirHojaPlanilla } from './excelEncabezado'
import { getCuadroArea } from '../config/cuadrosPresupuestales'

/**
 * Trae las filas del mes de TODAS las planillas y lista, por planilla, las
 * áreas presentes que tienen cuadro presupuestal (para pedir sus Nº Siaf
 * antes de generar el consolidado). La clave '*' representa el cuadro único
 * de una planilla sin áreas.
 * @returns {Promise<Array<{ planilla, filas, areas: string[] }>>}
 */
export async function cargarDatosConsolidado(periodo = null) {
  const datos = []
  for (const planilla of PLANILLAS) {
    // Trae todas las filas (bloques de 1000) para no truncar el consolidado
    let filas
    try {
      filas = await fetchAllRows(planilla.tabla, { order: 'apellidos_y_nombres', periodo })
    } catch {
      filas = []
    }
    let areas = []
    if (planilla.areas?.length) {
      areas = [...new Set(filas.map((f) => String(f.area ?? '').trim()).filter(Boolean))]
        .filter((a) => getCuadroArea(planilla.slug, a))
        .sort((a, b) => a.localeCompare(b, 'es'))
    } else if (filas.length && getCuadroArea(planilla.slug, null)) {
      areas = ['*']
    }
    datos.push({ planilla, filas, areas })
  }
  return datos
}

/**
 * Descarga un Excel con una hoja por planilla + hoja de resumen, para un mes.
 * @param {Array} resumenData - datos del RPC resumen_planillas (puede ser null)
 * @param {string|null} periodo - mes 'YYYY-MM-01' a exportar (null = sin filtro)
 * @param {Array} datos - resultado de cargarDatosConsolidado(periodo)
 * @param {Object} siafPorPlanilla - { [slug]: { [area]: siaf } } para los cuadros
 */
export function generarReporteConsolidado(resumenData, periodo, datos, siafPorPlanilla = {}) {
  const wb = XLSX.utils.book_new()

  // Hoja resumen al inicio
  const resumenRows = (resumenData ?? []).map((r) => ({
    Planilla: r.label ?? r.tabla,
    'N° Trabajadores': r.n_registros,
    'Total Ingreso': r.suma_ingreso,
    'Total Descuentos': r.suma_dsctos,
    'Total Líquido': r.suma_liquido,
  }))

  if (resumenRows.length > 0) {
    // fila de totales
    resumenRows.push({
      Planilla: 'TOTAL GENERAL',
      'N° Trabajadores': resumenRows.reduce((a, r) => a + (r['N° Trabajadores'] ?? 0), 0),
      'Total Ingreso': resumenRows.reduce((a, r) => a + (r['Total Ingreso'] ?? 0), 0),
      'Total Descuentos': resumenRows.reduce((a, r) => a + (r['Total Descuentos'] ?? 0), 0),
      'Total Líquido': resumenRows.reduce((a, r) => a + (r['Total Líquido'] ?? 0), 0),
    })
  }

  const wsResumen = XLSX.utils.json_to_sheet(resumenRows)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Una hoja por planilla
  for (const { planilla, filas } of datos) {
    const ws = construirHojaPlanilla(planilla, filas, periodo, siafPorPlanilla[planilla.slug] ?? {})
    // Nombre de hoja máx 31 chars
    XLSX.utils.book_append_sheet(wb, ws, planilla.label.slice(0, 31))
  }

  const sufijo = periodo ? formatPeriodo(periodo).replace(' ', '_') : hoy()
  XLSX.writeFile(wb, `Planillas_Consolidado_${sufijo}.xlsx`)
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
