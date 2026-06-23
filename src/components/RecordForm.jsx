import { useState, useEffect } from 'react'
import { X, Calculator } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { calcularTotales } from '../lib/calculos'
import { getSeccionesCalculo } from '../config/planillas'
import toast from 'react-hot-toast'

function emptyRecord(columnas) {
  return Object.fromEntries(columnas.map((c) => [c.key, '']))
}

function castValue(val, type) {
  if (val === '' || val === null || val === undefined) return null
  if (type === 'dni' || type === 'int') return parseInt(val, 10)
  if (type === 'money') return parseFloat(val)
  return val
}

export default function RecordForm({ planilla, record, onClose, onSaved }) {
  const { tabla, columnas } = planilla
  const isEdit = !!record?.id
  const secciones = getSeccionesCalculo(planilla)
  const totalKeys = new Set(['t_ingreso', 't_dsctos', 't_liquido'])

  const [form, setForm] = useState(() =>
    isEdit ? { ...record } : emptyRecord(columnas)
  )
  const [saving, setSaving] = useState(false)

  // Recalcula totales automáticamente cuando cambia cualquier ingreso/descuento
  useEffect(() => {
    if (!secciones) return
    const totales = calcularTotales(planilla, form)
    setForm((prev) => ({ ...prev, ...totales }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Observar solo los campos de ingresos y descuentos
    ...(secciones
      ? [...secciones.ingresoKeys, ...secciones.descuentoKeys].map((k) => form[k])
      : []),
  ])

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {}
    for (const col of columnas) {
      payload[col.key] = castValue(form[col.key], col.type)
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from(tabla).update(payload).eq('id', record.id))
    } else {
      ;({ error } = await supabase.from(tabla).insert(payload))
    }

    setSaving(false)
    if (error) {
      if (error.code === '23505') toast.error('El DNI ya existe en esta planilla.')
      else toast.error(error.message)
    } else {
      toast.success(isEdit ? 'Registro actualizado.' : 'Registro creado.')
      onSaved()
      onClose()
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
  const readonlyClass =
    'w-full border border-primary/30 bg-blue-50 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary'

  const isAutoTotal = (key) => secciones && totalKeys.has(key)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-primary text-lg">
              {isEdit ? 'Editar registro' : 'Nuevo registro'} — {planilla.label}
            </h2>
            {secciones && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <Calculator size={11} /> Totales calculados automáticamente
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto"
        >
          {columnas.map((col) => {
            const autoTotal = isAutoTotal(col.key)
            return (
              <div key={col.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  {col.label}
                  {autoTotal && <Calculator size={10} className="text-primary" />}
                </label>
                {col.type === 'text' ? (
                  <input
                    type="text"
                    value={form[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    required={col.required}
                    className={inputClass}
                  />
                ) : col.type === 'date' ? (
                  <input
                    type="date"
                    value={form[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    className={inputClass}
                  />
                ) : autoTotal ? (
                  // Totales: solo lectura, calculados en vivo
                  <input
                    type="number"
                    readOnly
                    value={form[col.key] ?? 0}
                    className={readonlyClass}
                    tabIndex={-1}
                  />
                ) : (
                  <input
                    type="number"
                    step={col.type === 'money' ? '0.01' : '1'}
                    value={form[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    required={col.type === 'dni' || col.required}
                    className={inputClass}
                  />
                )}
              </div>
            )
          })}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-light transition disabled:opacity-60"
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}
