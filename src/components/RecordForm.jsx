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

// Sistema de pensiones para el campo S.N.P. en el alta rápida (soloBasicos)
const AFP_OPCIONES = ['AFP Integra', 'Prima AFP', 'AFP Habitat', 'Profuturo AFP']

export default function RecordForm({ planilla, record, onClose, onSaved, soloBasicos = false }) {
  const { tabla, columnas } = planilla
  const isEdit = !!record?.id
  const secciones = getSeccionesCalculo(planilla)
  const totalKeys = new Set(['t_ingreso', 't_dsctos', 't_liquido'])

  // En el alta rápida solo se piden DNI, Apellidos y Nombres, Fecha de Ingreso,
  // S.N.P. y Tipo de acto administrativo.
  const columnasVisibles = soloBasicos
    ? columnas.filter(
        (c) =>
          c.key === 'dni' ||
          c.key === 'apellidos_y_nombres' ||
          c.key === 'snp' ||
          c.key === 'tipo_acto_administrativo' ||
          c.type === 'date'
      )
    : columnas

  const [form, setForm] = useState(() =>
    isEdit ? { ...record } : emptyRecord(columnas)
  )
  const [saving, setSaving] = useState(false)
  // Estado del selector S.N.P.: '' | 'ONP' | 'AFP' (el AFP concreto se guarda en form.snp)
  const [snpSistema, setSnpSistema] = useState(() => {
    const v = isEdit ? record?.snp : ''
    if (v === 'ONP') return 'ONP'
    if (AFP_OPCIONES.includes(v)) return 'AFP'
    return ''
  })

  const handleSnpSistema = (val) => {
    setSnpSistema(val)
    // ONP se guarda tal cual; AFP queda vacío hasta elegir la AFP concreta
    setForm((prev) => ({ ...prev, snp: val === 'ONP' ? 'ONP' : '' }))
  }

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

  // ¿Es obligatorio este campo?
  //  - Totales automáticos: nunca (son de solo lectura, los calcula la BD).
  //  - Alta rápida (soloBasicos): todos los campos visibles.
  //  - Al EDITAR: todos los campos → obliga a completar los que quedaron vacíos.
  //  - Al crear normal: solo DNI y los marcados `required` en la config.
  const esRequerido = (col) => {
    if (secciones && totalKeys.has(col.key)) return false
    if (soloBasicos) return true
    if (isEdit) return true
    return col.type === 'dni' || col.required
  }

  const estaVacio = (v) =>
    v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Alta rápida: los campos básicos son obligatorios
    if (soloBasicos) {
      const has = (k) => columnas.some((c) => c.key === k)
      const dateCol = columnas.find((c) => c.type === 'date')
      const faltan = []
      if (has('dni') && (form.dni === '' || form.dni == null)) faltan.push('D.N.I.')
      if (has('apellidos_y_nombres') && !String(form.apellidos_y_nombres ?? '').trim())
        faltan.push('Apellidos y Nombres')
      if (dateCol && !form[dateCol.key]) faltan.push('Fecha de Ingreso')
      if (has('snp') && !form.snp) faltan.push('S.N.P.')
      if (has('tipo_acto_administrativo') && !String(form.tipo_acto_administrativo ?? '').trim())
        faltan.push('Tipo de acto administrativo')
      if (faltan.length) {
        toast.error(`Faltan campos obligatorios: ${faltan.join(', ')}`)
        return
      }
    } else {
      // Formulario completo (crear/editar): valida todos los campos obligatorios.
      // Al editar esto incluye TODOS los campos, así que no se permiten vacíos.
      const faltan = columnasVisibles
        .filter((c) => esRequerido(c) && estaVacio(form[c.key]))
        .map((c) => c.label)
      if (faltan.length) {
        toast.error(`Completa todos los campos: ${faltan.join(', ')}`)
        return
      }
    }

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
            {secciones && !soloBasicos && (
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
          {columnasVisibles.map((col) => {
            const autoTotal = isAutoTotal(col.key)
            const requerido = esRequerido(col)
            const esSnpBasico = soloBasicos && col.key === 'snp'
            return (
              <div key={col.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  {col.label}
                  {requerido && <span className="text-red-500">*</span>}
                  {autoTotal && <Calculator size={10} className="text-primary" />}
                </label>
                {esSnpBasico ? (
                  <div className="space-y-2">
                    <select
                      value={snpSistema}
                      onChange={(e) => handleSnpSistema(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Seleccione…</option>
                      <option value="ONP">ONP</option>
                      <option value="AFP">AFP</option>
                    </select>
                    {snpSistema === 'AFP' && (
                      <select
                        value={form.snp ?? ''}
                        onChange={(e) => handleChange('snp', e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Seleccione AFP…</option>
                        {AFP_OPCIONES.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : col.type === 'text' ? (
                  <input
                    type="text"
                    value={form[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    required={requerido}
                    className={inputClass}
                  />
                ) : col.type === 'date' ? (
                  <input
                    type="date"
                    value={form[col.key] ?? ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    required={requerido}
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
                    required={requerido}
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
