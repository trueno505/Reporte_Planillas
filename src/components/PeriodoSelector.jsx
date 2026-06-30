import { Calendar } from 'lucide-react'
import { formatPeriodo } from '../lib/periodo'

/**
 * Selector de mes (periodo) reutilizable. Presentacional: recibe la lista de
 * periodos disponibles ('YYYY-MM-01') y el valor seleccionado.
 */
export default function PeriodoSelector({ periodos, value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1.5">
      <Calendar size={15} className="text-primary shrink-0" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title="Mes de la planilla"
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
      >
        {(periodos ?? []).map((p) => (
          <option key={p} value={p}>{formatPeriodo(p)}</option>
        ))}
      </select>
    </div>
  )
}
