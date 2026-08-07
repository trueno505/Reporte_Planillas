import { Printer, Loader2 } from 'lucide-react'

const OPCIONES = [
  { n: 1, label: '1 mes', detalle: 'Solo el mes actual' },
  { n: 2, label: '2 meses', detalle: 'Actual y el mes anterior' },
  { n: 4, label: '4 meses', detalle: 'Actual y los 3 meses anteriores' },
]

export default function BoletaMesesModal({ onSeleccionar, onCancel, loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <Printer className="text-primary mt-0.5 shrink-0" size={22} />
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Imprimir boleta</h3>
            <p className="text-gray-600 mt-1 text-sm">¿Cuántos meses consecutivos deseas incluir?</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {OPCIONES.map((o) => (
            <button
              key={o.n}
              onClick={() => onSeleccionar(o.n)}
              disabled={loading}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition text-left disabled:opacity-60"
            >
              <span>
                <span className="block font-medium text-gray-900 text-sm">{o.label}</span>
                <span className="block text-xs text-gray-500">{o.detalle}</span>
              </span>
              {loading && <Loader2 size={16} className="animate-spin text-primary shrink-0" />}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
