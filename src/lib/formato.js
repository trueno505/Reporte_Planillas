// Formateo para mostrar en pantalla y en los reportes.
//
// ÚNICA implementación del proyecto. Antes cada pantalla llamaba a
// toLocaleString('es-PE', …) por su cuenta y no todas pasaban los mismos
// options: PlanillaTable y BusquedaGlobal solo fijaban `minimumFractionDigits`,
// cuyo `maximumFractionDigits` por defecto es 3 — así que un mismo importe
// podía verse como "1,234.567" en la tabla y "1,234.57" en el dashboard.

const LOCALE = 'es-PE'

const MONEDA_OPTS = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

/** Importe en soles, siempre con 2 decimales: 1234.5 → "1,234.50". */
export function fmtMoneda(n) {
  return Number(n ?? 0).toLocaleString(LOCALE, MONEDA_OPTS)
}

/** Fecha corta local: '2026-08-11' → "11/8/2026". Vacío → "—". */
export function fmtFecha(s) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d) ? '—' : d.toLocaleDateString(LOCALE)
}

/** Fecha + hora, para la auditoría. Vacío → "—". */
export function fmtFechaHora(s) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d) ? '—' : d.toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' })
}
