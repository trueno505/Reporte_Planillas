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

// Días entre el epoch de Excel (1899-12-30, que ya absorbe el bug del año
// bisiesto 1900) y el epoch de JavaScript (1970-01-01).
const EXCEL_EPOCH_OFFSET = 25569
const MS_POR_DIA = 86400000

function fechaISO(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Normaliza una fecha a 'YYYY-MM-DD'. Acepta:
 *   · número  → serial de Excel (días desde 1899-12-30)
 *   · Date
 *   · 'YYYY-M-D' / 'YYYY-MM-DD'
 *   · 'D/M/YYYY' / 'DD-MM-YYYY'
 * Si no reconoce el formato devuelve el texto tal cual, para que la BD sea
 * quien rechace el valor en vez de guardar una fecha inventada.
 *
 * La conversión del serial se hace a mano (en vez de con XLSX.SSF) a propósito:
 * este módulo lo usa RecordForm, que está en la ruta crítica, y depender de
 * `xlsx` metía 1.35 MB en el bundle inicial solo por esta línea.
 */
export function parseFechaExcel(val) {
  if (val === '' || val === null || val === undefined) return null

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null
    // Se usan los getters UTC para que el resultado no dependa de la zona
    // horaria del navegador (en Lima, getDate() daría el día anterior).
    const d = new Date(Math.round((val - EXCEL_EPOCH_OFFSET) * MS_POR_DIA))
    if (isNaN(d)) return null
    return fechaISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }

  // Objeto Date (xlsx puede devolverlo con cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val)) return null
    return fechaISO(val.getFullYear(), val.getMonth() + 1, val.getDate())
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
