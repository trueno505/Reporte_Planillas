// Conversión de un valor externo (celda de Excel o input del formulario) al
// tipo que espera la columna en la base de datos.
//
// ÚNICA implementación del proyecto. Antes existían tres copias que habían
// divergido entre sí:
//   · RecordForm.castValue          — sin trim ni manejo de fechas
//   · ExcelActualizarColumna.castValue — fechas solo en ISO o serial Excel
//   · ExcelImportarMasivo.castValor    — fechas también en dd/mm/yyyy
// El resultado era que el MISMO archivo se interpretaba distinto según por qué
// botón entrara. Ahora las tres rutas comparten este módulo.

import * as XLSX from 'xlsx'

/**
 * Normaliza una fecha a 'YYYY-MM-DD'. Acepta:
 *   · número  → serial de Excel (días desde 1900)
 *   · 'YYYY-M-D' / 'YYYY-MM-DD'
 *   · 'D/M/YYYY' / 'DD-MM-YYYY'
 * Si no reconoce el formato devuelve el texto tal cual, para que la BD sea
 * quien rechace el valor en vez de guardar una fecha inventada.
 */
export function parseFechaExcel(val) {
  if (val === '' || val === null || val === undefined) return null

  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }

  // Objeto Date (xlsx puede devolverlo con cellDates: true)
  if (val instanceof Date && !isNaN(val)) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
  }

  const s = String(val).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return s
}

/**
 * Castea un valor al tipo de la columna destino.
 * Vacío (''/null/undefined) siempre → null, para que la columna quede en NULL
 * y no en 0 o en cadena vacía.
 *
 * @param {*} val
 * @param {'dni'|'int'|'money'|'date'|'text'} type
 * @returns {number|string|null}
 */
export function castValor(val, type) {
  if (val === '' || val === null || val === undefined) return null

  if (type === 'dni' || type === 'int') {
    const n = parseInt(String(val).trim(), 10)
    return isNaN(n) ? null : n
  }

  if (type === 'money') {
    // Acepta coma decimal ("1234,50"), habitual al escribir a mano en Excel.
    const n = parseFloat(String(val).trim().replace(',', '.'))
    return isNaN(n) ? null : n
  }

  if (type === 'date') return parseFechaExcel(val)

  return String(val).trim()
}
