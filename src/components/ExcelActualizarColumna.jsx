import { useRef, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { PencilLine, X, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getSeccionesCalculo } from '../config/planillas'
import toast from 'react-hot-toast'

// Castea el valor leído del Excel al tipo de la columna destino.
function castValue(val, type) {
  if (val === '' || val === null || val === undefined) return null
  if (type === 'dni' || type === 'int') {
    const n = parseInt(String(val).trim(), 10)
    return isNaN(n) ? null : n
  }
  if (type === 'money') {
    const n = parseFloat(String(val).trim().replace(',', '.'))
    return isNaN(n) ? null : n
  }
  if (type === 'date') {
    if (typeof val === 'number') {
      const d = XLSX.SSF.parse_date_code(val)
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }
    return String(val).trim()
  }
  return String(val).trim()
}

export default function ExcelActualizarColumna({ planilla, filas, onDone, onBusy }) {
  const { tabla, columnas, label } = planilla
  const inputRef = useRef()
  const [open, setOpen] = useState(false)
  const [columna, setColumna] = useState('')
  const [loading, setLoading] = useState(false)
  // { columna, colLabel, colType, actualizar: [{dni, valor, nombre}], noEncontrados: [dni], invalidos }
  const [preview, setPreview] = useState(null)

  // Columnas que se pueden actualizar: todas menos el DNI. Si la planilla
  // calcula totales automáticamente, se excluyen las columnas de total
  // (las sobreescribiría el trigger de la BD).
  const columnasEditables = useMemo(() => {
    const secciones = getSeccionesCalculo(planilla)
    const totales = secciones
      ? new Set([secciones.totalIngreso, secciones.totalDscto, secciones.totalLiquido])
      : new Set()
    return columnas.filter((c) => c.key !== 'dni' && !totales.has(c.key))
  }, [planilla, columnas])

  // DNIs existentes en la planilla → nombre, para validar y mostrar la vista previa.
  const dniIndex = useMemo(() => {
    const m = new Map()
    for (const f of filas ?? []) m.set(Number(f.dni), f.apellidos_y_nombres)
    return m
  }, [filas])

  const reset = () => {
    setOpen(false)
    setColumna('')
    setPreview(null)
  }

  const colMeta = columnas.find((c) => c.key === columna)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!columna) { toast.error('Primero selecciona la columna a actualizar.'); return }
    setLoading(true)

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null })

    if (rawRows.length === 0) {
      setLoading(false)
      toast.error('El archivo no tiene filas.')
      return
    }

    // Detectar la columna de DNI y la columna de valor en el Excel.
    const headers = Object.keys(rawRows[0])
    const dniHeader =
      headers.find((h) => String(h).trim().toLowerCase() === 'dni') ?? headers[0]
    // El valor: cabecera que coincida con la etiqueta de la columna elegida,
    // o "VALOR" / "MONTO" / "NUEVO", o la primera columna distinta del DNI.
    const norm = (s) => String(s).trim().toLowerCase()
    const valHeader =
      headers.find((h) => norm(h) === norm(colMeta.label)) ??
      headers.find((h) => ['valor', 'monto', 'nuevo', 'valor nuevo'].includes(norm(h))) ??
      headers.find((h) => h !== dniHeader)

    if (!valHeader) {
      setLoading(false)
      toast.error('El Excel debe tener una columna DNI y otra con el valor.')
      return
    }

    const actualizar = []
    const noEncontrados = []
    let invalidos = 0
    const vistos = new Set()

    for (const row of rawRows) {
      const dni = parseInt(String(row[dniHeader] ?? '').trim(), 10)
      if (isNaN(dni)) { invalidos++; continue }
      if (vistos.has(dni)) continue // ignora DNIs repetidos en el archivo
      vistos.add(dni)
      const valor = castValue(row[valHeader], colMeta.type)
      if (!dniIndex.has(dni)) {
        noEncontrados.push(dni)
        continue
      }
      actualizar.push({ dni, valor, nombre: dniIndex.get(dni) })
    }

    setLoading(false)
    setPreview({
      columna,
      colLabel: colMeta.label,
      colType: colMeta.type,
      actualizar,
      noEncontrados,
      invalidos,
    })
  }

  const handleConfirm = async () => {
    setLoading(true)
    onBusy?.(true)
    const valores = preview.actualizar.map((r) => ({ dni: r.dni, valor: r.valor }))
    const { data, error } = await supabase.rpc('actualizar_columna_planilla', {
      p_tabla: tabla,
      p_columna: preview.columna,
      p_valores: valores,
    })
    setLoading(false)
    onBusy?.(false)
    if (error) {
      console.error(error)
      toast.error(`Error al actualizar: ${error.message}`)
    } else {
      toast.success(`${data ?? valores.length} registros actualizados en ${label}.`)
      reset()
      onDone()
    }
  }

  // Descarga una plantilla con DNI + nombre + columna a llenar para todos los
  // registros actuales de la planilla.
  const descargarPlantilla = () => {
    if (!columna) { toast.error('Primero selecciona la columna a actualizar.'); return }
    const datos = (filas ?? []).map((f) => ({
      DNI: f.dni,
      'Apellidos y Nombres': f.apellidos_y_nombres,
      [colMeta.label]: f[columna] ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(
      datos.length ? datos : [{ DNI: '', 'Apellidos y Nombres': '', [colMeta.label]: '' }]
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Actualizar')
    XLSX.writeFile(wb, `plantilla_${tabla}_${columna}.xlsx`)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
      >
        <PencilLine size={15} />
        Actualizar columna
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">Actualizar columna por Excel — {label}</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Paso 1: elegir columna */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Columna a actualizar
            </label>
            <select
              value={columna}
              onChange={(e) => { setColumna(e.target.value); setPreview(null) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Selecciona una columna —</option>
              {columnasEditables.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            {columna && !preview && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  El Excel debe tener una columna <strong>DNI</strong> y otra con el nuevo valor
                  (cabecera <strong>«{colMeta.label}»</strong> o <strong>«VALOR»</strong>). Solo se
                  actualizarán los DNI que existan en esta planilla.
                </p>
                <div className="flex gap-2 mb-1">
                  <button
                    onClick={descargarPlantilla}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    <Download size={14} />
                    Descargar plantilla
                  </button>
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    <PencilLine size={14} />
                    {loading ? 'Leyendo…' : 'Subir Excel'}
                  </button>
                </div>
              </>
            )}

            {/* Paso 2: vista previa */}
            {preview && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{preview.actualizar.length}</p>
                    <p className="text-xs text-green-600">Se actualizarán</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${preview.noEncontrados.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.noEncontrados.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                    <p className={`text-2xl font-bold ${preview.noEncontrados.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>{preview.noEncontrados.length}</p>
                    <p className={`text-xs ${preview.noEncontrados.length > 0 ? 'text-amber-600' : 'text-gray-500'}`}>DNI no encontrados</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${preview.invalidos > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.invalidos > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                    <p className={`text-2xl font-bold ${preview.invalidos > 0 ? 'text-red-700' : 'text-gray-500'}`}>{preview.invalidos}</p>
                    <p className={`text-xs ${preview.invalidos > 0 ? 'text-red-600' : 'text-gray-500'}`}>DNI inválidos</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-1">
                  Columna: <strong>{preview.colLabel}</strong>. Registros a actualizar:
                </p>
                <div className="border rounded-lg overflow-hidden mb-3 max-h-44 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">DNI</th>
                        <th className="px-2 py-1.5 text-left">Apellidos y Nombres</th>
                        <th className="px-2 py-1.5 text-right">{preview.colLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.actualizar.slice(0, 50).map((r, i) => (
                        <tr key={r.dni} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{r.dni}</td>
                          <td className="px-2 py-1">{r.nombre}</td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {r.valor === null ? '—' : r.valor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.actualizar.length > 50 && (
                  <p className="text-xs text-gray-400 mb-2">… y {preview.actualizar.length - 50} más.</p>
                )}

                {preview.noEncontrados.length > 0 && (
                  <p className="text-xs text-amber-600 mb-3">
                    No se actualizarán (DNI no existe en esta planilla):{' '}
                    {preview.noEncontrados.slice(0, 20).join(', ')}
                    {preview.noEncontrados.length > 20 ? `, … (+${preview.noEncontrados.length - 20})` : ''}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setPreview(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || preview.actualizar.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    {loading ? 'Actualizando…' : `Confirmar (${preview.actualizar.length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
