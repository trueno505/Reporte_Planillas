// Utilidades para el "periodo" mensual de las planillas.
// El periodo se guarda en la BD como DATE = primer día del mes ('YYYY-MM-01')
// y viaja al frontend como string 'YYYY-MM-01'.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// 'YYYY-MM-01' → "Junio 2026". Tolera valores nulos.
export function formatPeriodo(p) {
  if (!p) return '—'
  const [y, m] = String(p).slice(0, 10).split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES[idx] ?? m} ${y}`
}

// Mes calendario actual como 'YYYY-MM-01'.
export function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// Mes siguiente a un periodo 'YYYY-MM-01' → 'YYYY-MM-01'.
export function siguientePeriodo(p) {
  const [y, m] = String(p).slice(0, 10).split('-').map(Number)
  const d = new Date(y, m - 1 + 1, 1) // m es 1-based; +1 mes
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// Mes anterior a un periodo 'YYYY-MM-01' → 'YYYY-MM-01'.
export function periodoAnterior(p) {
  const [y, m] = String(p).slice(0, 10).split('-').map(Number)
  const d = new Date(y, m - 1 - 1, 1) // m es 1-based; -1 mes
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// Lista de `n` periodos consecutivos que terminan en `p` (incluido), en orden ascendente.
export function ultimosPeriodos(p, n) {
  const periodos = []
  let cursor = p
  for (let i = 0; i < n; i++) {
    periodos.unshift(cursor)
    cursor = periodoAnterior(cursor)
  }
  return periodos
}

// Normaliza cualquier fecha 'YYYY-MM-DD' al primer día de su mes.
export function aPrimerDiaMes(p) {
  return `${String(p).slice(0, 7)}-01`
}

// ---------------------------------------------------------------------------
// Lista de meses de una planilla (RPC `periodos_planilla`).
//
// Se consultaba en CADA montaje de PlanillaPage: entrar, salir y volver a una
// planilla, o alternar entre dos, repetía la misma llamada. La lista solo
// cambia cuando se genera un mes nuevo, así que se cachea y se invalida ahí.
// ---------------------------------------------------------------------------
import { supabase } from './supabaseClient'
import { crearCache } from './cache'

const cachePeriodos = crearCache({ nombre: 'periodos_planilla', ttlMs: 10 * 60 * 1000 })

export function cargarPeriodos(tabla) {
  return cachePeriodos.get(tabla, async () => {
    const { data, error } = await supabase.rpc('periodos_planilla', { p_tabla: tabla })
    if (error) throw error
    return (data ?? []).map((r) => String(r.periodo).slice(0, 10))
  })
}

/** Llamar tras `abrir_periodo`: la lista cacheada quedó corta. */
export function invalidarPeriodos(tabla) {
  cachePeriodos.invalidar(tabla)
}
