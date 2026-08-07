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
