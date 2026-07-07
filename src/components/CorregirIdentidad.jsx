import { useState } from 'react'
import { X, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getColumnasIdentidad } from '../config/planillas'
import toast from 'react-hot-toast'

/**
 * Corrige los datos FIJOS (identidad) de un trabajador. El cambio se aplica a
 * TODOS sus meses (incluidos los cerrados) vía la RPC corregir_identidad. El DNI
 * no se edita (identifica al trabajador).
 */
export default function CorregirIdentidad({ planilla, record, onClose, onSaved }) {
  const cols = getColumnasIdentidad(planilla).filter((c) => c.key !== 'dni')
  const [form, setForm] = useState(() =>
    Object.fromEntries(cols.map((c) => [c.key, record[c.key] ?? '']))
  )
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const datos = {}
    for (const c of cols) datos[c.key] = form[c.key] === '' ? null : form[c.key]
    const { data, error } = await supabase.rpc('corregir_identidad', {
      p_tabla: planilla.tabla,
      p_dni: record.dni,
      p_datos: datos,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Datos corregidos en ${data ?? 0} mes(es).`)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
            <ShieldAlert size={18} /> Corregir datos fijos
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            DNI <strong>{record.dni}</strong>. Estos datos se aplicarán a <strong>todos los
            meses</strong> de este trabajador (también los cerrados).
          </div>

          {cols.map((c) => (
            <div key={c.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{c.label}</label>
              {c.key === 'area' && (planilla.areas?.length ?? 0) > 0 ? (
                <select
                  value={form.area ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Seleccione área…</option>
                  {[...planilla.areas]
                    .sort((a, b) => a.localeCompare(b, 'es'))
                    .map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type={c.type === 'date' ? 'date' : 'text'}
                  value={form[c.key] ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Aplicar a todos los meses'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
