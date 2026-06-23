import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { calcularTotales } from '../lib/calculos'
import toast from 'react-hot-toast'

function castValue(val, type) {
  if (val === '' || val === null || val === undefined) return null
  if (type === 'dni' || type === 'int') return parseInt(String(val).trim(), 10)
  if (type === 'money') return parseFloat(String(val).trim())
  if (type === 'date') {
    if (typeof val === 'number') {
      const d = XLSX.SSF.parse_date_code(val)
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }
    return String(val).trim()
  }
  return String(val).trim()
}

export default function ExcelImport({ planilla, onDone, onBusy }) {
  const { tabla, columnas, label } = planilla
  const inputRef = useRef()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null) // { rows, nuevos, actualizados, errores }

  const labelToKey = Object.fromEntries(columnas.map((c) => [c.label, c.key]))
  const keyToType = Object.fromEntries(columnas.map((c) => [c.key, c.type]))
  const keysValidas = new Set(columnas.map((c) => c.key))

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null })

    // Mapear headers → keys y coercionar tipos
    const rows = rawRows.map((row) => {
      const mapped = {}
      for (const [header, val] of Object.entries(row)) {
        const key = labelToKey[header] ?? header
        // Ignorar columnas que no pertenecen a esta planilla (evita romper el upsert)
        if (!keysValidas.has(key)) continue
        mapped[key] = castValue(val, keyToType[key])
      }
      // Aplicar cálculo automático de totales (solo para la vista previa;
      // la BD los recalcula con el trigger al guardar)
      const totales = calcularTotales(planilla, mapped)
      return { ...mapped, ...totales }
    })

    // Detectar DNIs inválidos
    const errores = rows.filter((r) => !r.dni || isNaN(r.dni)).length

    // Consultar qué DNIs ya existen en la tabla (en bloques, para no exceder
    // el largo máximo de la URL del request con miles de DNIs)
    const dnis = rows.filter((r) => r.dni).map((r) => r.dni)
    const dniSet = new Set()
    const Q_CHUNK = 500
    for (let i = 0; i < dnis.length; i += Q_CHUNK) {
      const slice = dnis.slice(i, i + Q_CHUNK)
      const { data: existentes } = await supabase.from(tabla).select('dni').in('dni', slice)
      for (const r of existentes ?? []) dniSet.add(r.dni)
    }
    const nuevos = rows.filter((r) => r.dni && !dniSet.has(r.dni)).length
    const actualizados = rows.filter((r) => r.dni && dniSet.has(r.dni)).length

    setLoading(false)
    setPreview({ rows, nuevos, actualizados, errores })
  }

  const handleConfirm = async () => {
    setLoading(true)
    onBusy?.(true)
    // Solo filas con DNI válido (la clave de conflicto del upsert)
    const validas = preview.rows.filter((r) => r.dni && !isNaN(r.dni))
    // UPSERT atómico en una sola transacción (RPC). Si algo falla, no queda
    // ningún cambio parcial.
    const { data, error } = await supabase.rpc('importar_planilla', {
      p_tabla: tabla,
      p_filas: validas,
    })
    setLoading(false)
    onBusy?.(false)
    setPreview(null)
    if (error) {
      console.error(error)
      toast.error(`Error al importar: ${error.message}`)
    } else {
      toast.success(`${data ?? validas.length} registros importados/actualizados en ${label}.`)
    }
    onDone()
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-60"
      >
        <Upload size={15} />
        {loading ? 'Leyendo...' : 'Importar Excel'}
      </button>

      {/* Modal de vista previa */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">Vista previa — {label}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{preview.nuevos}</p>
                <p className="text-xs text-green-600">Nuevos</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <Upload size={20} className="text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{preview.actualizados}</p>
                <p className="text-xs text-blue-600">Actualizados</p>
              </div>
              <div className={`border rounded-lg p-3 text-center ${preview.errores > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.errores > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <p className={`text-2xl font-bold ${preview.errores > 0 ? 'text-red-700' : 'text-gray-500'}`}>{preview.errores}</p>
                <p className={`text-xs ${preview.errores > 0 ? 'text-red-600' : 'text-gray-500'}`}>Con error</p>
              </div>
            </div>

            {/* Muestra las 5 primeras filas */}
            <div className="border rounded-lg overflow-hidden mb-5 max-h-40 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">DNI</th>
                    <th className="px-2 py-1.5 text-left">Apellidos y Nombres</th>
                    <th className="px-2 py-1.5 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1">{r.dni}</td>
                      <td className="px-2 py-1">{r.apellidos_y_nombres}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{Number(r.t_liquido ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Total {preview.rows.length} filas. Los totales serán recalculados automáticamente.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || preview.rows.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-60"
              >
                {loading ? 'Importando...' : `Confirmar (${preview.nuevos + preview.actualizados} filas)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
