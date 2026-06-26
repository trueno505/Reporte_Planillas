import { ChevronLeft, ChevronRight } from 'lucide-react'

// Construye la secuencia de páginas a mostrar con elipsis:
//   « Anterior | 1 … 4 5 6 … 20 | Siguiente »
// `vecinos` = cuántas páginas mostrar a cada lado de la actual.
function construirRango(actual, total, vecinos = 1) {
  if (total <= 1) return [1]
  const paginas = [1]
  const izquierda = Math.max(2, actual - vecinos)
  const derecha = Math.min(total - 1, actual + vecinos)

  if (izquierda > 2) paginas.push('…')
  for (let i = izquierda; i <= derecha; i++) paginas.push(i)
  if (derecha < total - 1) paginas.push('…')

  paginas.push(total)
  return paginas
}

/**
 * Control de paginación reutilizable (Tailwind) para todas las planillas.
 *
 * @param {{
 *   page: number,        // página actual (1-based)
 *   pageCount: number,   // total de páginas (Math.ceil(total / pageSize))
 *   onPage: (n: number) => void,
 *   total?: number,      // total de registros (para el texto "Mostrando …")
 *   pageSize?: number,
 * }} props
 */
export default function Paginacion({ page, pageCount, onPage, total = 0, pageSize = 50 }) {
  // Con una sola página (o ninguna) no se muestra el control.
  if (pageCount <= 1) return null

  const paginas = construirRango(page, pageCount)
  const desde = (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)

  return (
    <nav
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      aria-label="Paginación"
    >
      {total > 0 && (
        <p className="text-sm text-gray-500">
          Mostrando <span className="font-medium text-gray-700">{desde}</span>–
          <span className="font-medium text-gray-700">{hasta}</span> de{' '}
          <span className="font-medium text-gray-700">{total}</span> trabajadores
        </p>
      )}

      <ul className="flex items-center gap-1 sm:ml-auto">
        {/* Anterior */}
        <li>
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
            Anterior
          </button>
        </li>

        {/* Números de página con elipsis */}
        {paginas.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`}>
              <span className="px-2 py-1.5 text-sm text-gray-400 select-none">…</span>
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-[2rem] px-2.5 py-1.5 rounded-lg text-sm font-medium border transition ${
                  p === page
                    ? 'bg-primary text-white border-primary'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            </li>
          )
        )}

        {/* Siguiente */}
        <li>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight size={15} />
          </button>
        </li>
      </ul>
    </nav>
  )
}
