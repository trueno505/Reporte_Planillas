import { useState, useEffect } from 'react'
import { X, Calculator, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { calcularTotales, round2 } from '../lib/calculos'
import { getSeccionesCalculo, esColumnaIdentidad } from '../config/planillas'
import CorregirIdentidad from './CorregirIdentidad'
import { formatPeriodo } from '../lib/periodo'
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

// 'Vacaciones' (Empleados Permanentes) es texto libre a nivel de columna,
// pero solo admite el nombre de un mes (o vacío): se restringe con un
// <select> aquí y con un CHECK en la BD (ver migracion_vacaciones_texto.sql).
const MESES_VACACIONES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const fmtMoney = (n) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MAX_RETENCIONES = 10

// Campo especial para columnas con `formulaBase` (p.ej. Ret. Jud. en
// Alcalde): cada retención aplica un % sobre (Total Ingreso − suma de
// formulaBase). El detalle de porcentajes se guarda en `col.detalleKey`; el
// total (suma de cada monto ya redondeado a 2 decimales) se guarda en
// `col.key`, que sigue siendo una descuentoKey normal para t_dsctos/t_liquido.
function CampoFormula({ col, form, setForm }) {
  const pcts = form[col.detalleKey] ?? []

  const base = col.formulaBase.reduce(
    (acc, k) => acc - (parseFloat(form[k]) || 0),
    parseFloat(form.t_ingreso) || 0
  )
  const montos = pcts.map((p) => round2((base * (parseFloat(p) || 0)) / 100))
  const total = round2(montos.reduce((a, b) => a + b, 0))

  // Mantiene la columna real (p.ej. ret_jud) sincronizada con el detalle;
  // como es una descuentoKey normal, esto a su vez dispara el recálculo de
  // t_dsctos/t_liquido en el efecto de totales de RecordForm. Con 0
  // retenciones no se toca: evita que, al abrir un registro creado antes de
  // este cálculo automático (con un ret_jud cargado a mano y sin detalle),
  // se pise ese valor con 0 solo por abrir el formulario.
  useEffect(() => {
    if (pcts.length === 0) return
    setForm((prev) => (prev[col.key] === total ? prev : { ...prev, [col.key]: total }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, pcts.length])

  const setCantidad = (n) => {
    n = Math.max(0, Math.min(MAX_RETENCIONES, n))
    setForm((prev) => ({
      ...prev,
      [col.detalleKey]: Array.from({ length: n }, (_, i) => pcts[i] ?? ''),
    }))
  }

  const setPct = (i, val) => {
    const next = [...pcts]
    next[i] = val
    setForm((prev) => ({ ...prev, [col.detalleKey]: next }))
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">Base: S/ {fmtMoney(base)}</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          N° retenciones
          <select
            value={pcts.length}
            onChange={(e) => setCantidad(parseInt(e.target.value, 10))}
            className="border border-gray-200 rounded px-1.5 py-1 text-xs"
          >
            {Array.from({ length: MAX_RETENCIONES + 1 }, (_, n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {pcts.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-14 shrink-0">Ret. {i + 1}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={p}
            onChange={(e) => setPct(i, e.target.value)}
            placeholder="%"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-sm font-medium text-primary w-28 text-right shrink-0">
            S/ {fmtMoney(montos[i])}
          </span>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-sm font-semibold text-primary">
        <span>Total {col.label}</span>
        <span>S/ {fmtMoney(total)}</span>
      </div>
    </div>
  )
}

export default function RecordForm({ planilla, record, onClose, onSaved, soloBasicos = false, periodo = null }) {
  const { tabla, columnas } = planilla
  const isEdit = !!record?.id
  const secciones = getSeccionesCalculo(planilla)
  const totalKeys = new Set(['t_ingreso', 't_dsctos', 't_liquido'])

  // Al editar un mes, las columnas FIJAS (identidad) van en solo lectura: solo
  // se corrigen con la acción aparte (que las cambia en todos los meses).
  const [corregirOpen, setCorregirOpen] = useState(false)
  const esFijaBloqueada = (key) => isEdit && !soloBasicos && esColumnaIdentidad(key)

  // En el alta rápida solo se piden DNI, Apellidos y Nombres, Fecha de Ingreso,
  // S.N.P., Área (si la planilla tiene áreas) y Tipo de acto administrativo.
  const columnasVisibles = soloBasicos
    ? columnas.filter(
        (c) =>
          c.key === 'dni' ||
          c.key === 'apellidos_y_nombres' ||
          c.key === 'snp' ||
          c.key === 'area' ||
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

  // Firma de los campos observados (ingresos + descuentos) serializada en una
  // sola dependencia estable: evita el spread en el array de deps y recalcula
  // los totales solo cuando cambia alguno de esos montos.
  const observados = secciones
    ? [...secciones.ingresoKeys, ...secciones.descuentoKeys].map((k) => form[k]).join('|')
    : ''

  // Recalcula totales automáticamente cuando cambia cualquier ingreso/descuento
  useEffect(() => {
    if (!secciones) return
    const totales = calcularTotales(planilla, form)
    setForm((prev) => ({ ...prev, ...totales }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observados])

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // ¿Es obligatorio este campo?
  //  - Totales automáticos: nunca (son de solo lectura, los calcula la BD).
  //  - Vacaciones: nunca (excepción explícita; no todos los meses hay vacaciones).
  //  - Alta rápida (soloBasicos): todos los campos visibles.
  //  - Al EDITAR: todos los campos → obliga a completar los que quedaron vacíos.
  //  - Al crear normal: solo DNI y los marcados `required` en la config.
  const esRequerido = (col) => {
    if (secciones && totalKeys.has(col.key)) return false
    if (col.formulaBase) return false // se calcula solo (ver CampoFormula)
    if (esFijaBloqueada(col.key)) return false // identidad en solo lectura al editar
    if (col.key === 'vacaciones') return false
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
      if (has('area') && planilla.areas?.length && !String(form.area ?? '').trim())
        faltan.push('Área')
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
      if (col.detalleKey) {
        payload[col.detalleKey] = (form[col.detalleKey] ?? []).map((p) => parseFloat(p) || 0)
      }
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from(tabla).update(payload).eq('id', record.id))
    } else {
      // El alta entra en el mes ABIERTO (periodo). Si no llega, la BD usa el mes
      // calendario actual por defecto.
      if (periodo) payload.periodo = periodo
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
            {periodo && (
              <p className="text-xs text-gray-500 mt-0.5">Mes: <strong>{formatPeriodo(periodo)}</strong></p>
            )}
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
            const esAreaSelect = col.key === 'area' && (planilla.areas?.length ?? 0) > 0
            const esVacacionesSelect = col.key === 'vacaciones'
            const fijaBloqueada = esFijaBloqueada(col.key)
            return (
              <div
                key={col.key}
                className={esAreaSelect || col.formulaBase ? 'sm:col-span-2 lg:col-span-3' : undefined}
              >
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  {col.label}
                  {requerido && <span className="text-red-500">*</span>}
                  {(autoTotal || col.formulaBase) && <Calculator size={10} className="text-primary" />}
                  {fijaBloqueada && <span className="text-gray-400 text-[10px]">(fijo)</span>}
                </label>
                {col.formulaBase ? (
                  <CampoFormula col={col} form={form} setForm={setForm} />
                ) : fijaBloqueada ? (
                  // Columna de identidad: solo lectura al editar el mes.
                  <input
                    type="text"
                    readOnly
                    value={form[col.key] ?? ''}
                    title="Dato fijo. Usa «Corregir datos fijos» para cambiarlo en todos los meses."
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-500 cursor-not-allowed"
                    tabIndex={-1}
                  />
                ) : esSnpBasico ? (
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
                ) : esAreaSelect ? (
                  <select
                    value={form.area ?? ''}
                    onChange={(e) => handleChange('area', e.target.value)}
                    required={requerido}
                    className={inputClass}
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
                ) : esVacacionesSelect ? (
                  <select
                    value={form.vacaciones ?? ''}
                    onChange={(e) => handleChange('vacaciones', e.target.value)}
                    required={requerido}
                    className={inputClass}
                  >
                    <option value="">Seleccione mes…</option>
                    {MESES_VACACIONES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
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

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {isEdit && !soloBasicos && (
            <button
              onClick={() => setCorregirOpen(true)}
              className="mr-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 transition"
              title="Cambia nombres/fecha/S.N.P./área/tipo de acto en todos los meses"
            >
              <ShieldAlert size={14} /> Corregir datos fijos
            </button>
          )}
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

      {corregirOpen && (
        <CorregirIdentidad
          planilla={planilla}
          record={record}
          onClose={() => setCorregirOpen(false)}
          onSaved={() => { onSaved?.(); onClose() }}
        />
      )}
    </div>
  )
}
