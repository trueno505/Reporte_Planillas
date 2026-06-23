import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false, loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          {danger && <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={22} />}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            <p className="text-gray-600 mt-1 text-sm">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-light'
            }`}
          >
            {loading ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
