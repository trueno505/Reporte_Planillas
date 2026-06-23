import * as XLSX from 'xlsx'
import { fetchAllRows } from './db'
import { PLANILLAS } from '../config/planillas'

/**
 * Descarga un Excel con una hoja por planilla + hoja de resumen.
 * @param {Array} resumenData - datos del RPC resumen_planillas (puede ser null)
 */
export async function generarReporteConsolidado(resumenData) {
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
  for (const planilla of PLANILLAS) {
    // Trae todas las filas (bloques de 1000) para no truncar el consolidado
    let data
    try {
      data = await fetchAllRows(planilla.tabla, { order: 'apellidos_y_nombres' })
    } catch {
      data = []
    }

    const rows = data.map((fila) =>
      Object.fromEntries(planilla.columnas.map((c) => [c.label, fila[c.key] ?? '']))
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    // Nombre de hoja máx 31 chars
    XLSX.utils.book_append_sheet(wb, ws, planilla.label.slice(0, 31))
  }

  XLSX.writeFile(wb, `Planillas_Consolidado_${hoy()}.xlsx`)
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
