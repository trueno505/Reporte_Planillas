import { useState } from 'react'
import { Download, X } from 'lucide-react'

/**
 * Modal que pide el Nº Siaf de cada área antes de generar un Excel.
 *
 * `grupos` = [{ id, label, areas: string[] }] — un grupo por planilla.
 * La clave de área '*' representa el cuadro único de una planilla sin áreas
 * (se muestra con el label de la planilla).
 * `onConfirm` recibe { [id]: { [area]: siaf } }; los campos vacíos salen en
 * blanco en el Excel. El input solo admite dígitos.
 */
export default function SiafModal({ grupos, onConfirm, onCancel, titulo = 'Nº Siaf por área' }) {
  const [valores, setValores] = useState({})
  const setVal = (id, area, v) =>
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], [area]: v } }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{titulo}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-500">
            Ingresa el Nº Siaf de cada área para el cuadro presupuestal. Los campos
            vacíos saldrán en blanco en el Excel.
          </p>
          {grupos.map((g) => (
            <div key={g.id} className="space-y-2">
              {grupos.length > 1 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-primary border-b border-gray-100 pb-1">
                  {g.label}
                </p>
              )}
              {g.areas.map((a) => (
                <div key={a} className="flex items-center gap-3">
                  <label className="flex-1 text-sm text-gray-700">
                    {a === '*' ? g.label : a}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valores[g.id]?.[a] ?? ''}
                    onChange={(e) => setVal(g.id, a, e.target.value.replace(/\D/g, ''))}
                    placeholder="Nº Siaf"
                    className="w-32 px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(valores)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90"
          >
            <Download size={15} />
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
