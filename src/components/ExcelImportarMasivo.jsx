import { useRef, useState, useMemo, useEffect } from 'react'
import { Upload, X, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllRows } from '../lib/db'
import { castValor } from '../lib/casteo'
import { getSeccionesCalculo, emparejarEncabezados } from '../config/planillas'
import toast from 'react-hot-toast'

// `xlsx` (~1.35 MB) se carga solo al usar la importación, no en el arranque.
const cargarXLSX = () => import('xlsx-js-style')

export default function ExcelImportarMasivo({ planilla, periodo, onDone, onBusy }) {
  const { tabla, columnas, label } = planilla
  const inputRef = useRef()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoFilas, setCargandoFilas] = useState(false)
  // registros existentes de ESTA planilla en el mes abierto → detectar duplicados
  const [filasAll, setFilasAll] = useState(null)
  // { crear: [{...cols}], yaExisten: [{dni,nombre}], conflictos: [{dni,nombre,tabla}], invalidas: [{fila,motivo}] }
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (open && filasAll == null) {
      setCargandoFilas(true)
      fetchAllRows(tabla, { order: 'apellidos_y_nombres', periodo })
        .then(setFilasAll)
        .catch((e) => toast.error(`No se pudieron cargar los registros: ${e.message}`))
        .finally(() => setCargandoFilas(false))
    }
  }, [open, filasAll, tabla, periodo])

  const dniIndex = useMemo(() => {
    const m = new Map()
    for (const f of filasAll ?? []) m.set(Number(f.dni), f.apellidos_y_nombres)
    return m
  }, [filasAll])

  // Columnas a importar: todas menos los totales auto-calculados por el trigger de la BD.
  const columnasImportables = useMemo(() => {
    const secciones = getSeccionesCalculo(planilla)
    const totales = secciones
      ? new Set([secciones.totalIngreso, secciones.totalDscto, secciones.totalLiquido])
      : new Set()
    return columnas.filter((c) => !totales.has(c.key))
  }, [planilla, columnas])

  const requeridas = useMemo(
    () => columnasImportables.filter((c) => c.type === 'dni' || c.required),
    [columnasImportables]
  )

  const reset = () => {
    setOpen(false)
    setPreview(null)
    setFilasAll(null)
  }

  const descargarPlantilla = async () => {
    try {
      const XLSX = await cargarXLSX()
      const headers = columnasImportables.map((c) => c.label)
      const ws = XLSX.utils.aoa_to_sheet([headers])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Importar')
      XLSX.writeFile(wb, `plantilla_importar_${tabla}.xlsx`)
    } catch (e) {
      toast.error(`No se pudo generar la plantilla: ${e.message}`)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)

    try {
      const XLSX = await cargarXLSX()
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) {
        toast.error('El archivo no tiene ninguna hoja legible.')
        return
      }
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null })

      if (rawRows.length === 0) {
        toast.error('El archivo no tiene filas.')
        return
      }

      const headers = Object.keys(rawRows[0])
      // Acepta el rótulo actual y los históricos (p.ej. "S.N.P." → "AFIL. A :"),
      // para que una plantilla descargada antes de un rename siga sirviendo.
      const headerPorColumna = emparejarEncabezados(columnasImportables, headers)
      if (!headerPorColumna.has('dni')) {
        toast.error('El Excel debe tener una columna DNI (usa la plantilla para respetar los encabezados).')
        return
      }

      const invalidas = []
      const yaExisten = []
      let crear = []
      const vistos = new Set()

      rawRows.forEach((row, i) => {
        const obj = {}
        for (const col of columnasImportables) {
          const h = headerPorColumna.get(col.key)
          obj[col.key] = h ? castValor(row[h], col.type) : null
        }
        const faltan = requeridas.filter((c) => obj[c.key] === null)
        if (faltan.length) {
          invalidas.push({ fila: i + 2, motivo: `Falta ${faltan.map((c) => c.label).join(', ')}` })
          return
        }
        if (vistos.has(obj.dni)) return // ignora DNI repetido en el archivo
        vistos.add(obj.dni)
        if (dniIndex.has(obj.dni)) {
          yaExisten.push({ dni: obj.dni, nombre: dniIndex.get(obj.dni) })
          return
        }
        crear.push(obj)
      })

      // Chequeo cruzado: un DNI no puede estar en dos planillas el mismo mes.
      let conflictos = []
      if (crear.length) {
        const dnis = crear.map((r) => r.dni)
        const encontrados = []
        for (let i = 0; i < dnis.length; i += 500) {
          const chunk = dnis.slice(i, i + 500)
          const { data, error } = await supabase
            .from('dni_registro')
            .select('dni, tabla')
            .eq('periodo', periodo)
            .in('dni', chunk)
          if (error) {
            toast.error(`No se pudo validar los DNI: ${error.message}`)
            return
          }
          encontrados.push(...(data ?? []))
        }
        const otraTabla = new Map(
          encontrados.filter((r) => r.tabla !== tabla).map((r) => [r.dni, r.tabla])
        )
        if (otraTabla.size) {
          conflictos = crear
            .filter((r) => otraTabla.has(r.dni))
            .map((r) => ({ dni: r.dni, nombre: r.apellidos_y_nombres, tabla: otraTabla.get(r.dni) }))
          crear = crear.filter((r) => !otraTabla.has(r.dni))
        }
      }

      setPreview({ crear, yaExisten, conflictos, invalidas })
    } catch (err) {
      // Sin este catch, un .xlsx corrupto dejaba una promesa rechazada sin
      // manejar y el usuario no veía ningún mensaje.
      console.error('Error al leer el Excel:', err)
      toast.error(`No se pudo leer el Excel: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    onBusy?.(true)
    const rows = preview.crear.map((r) => ({ ...r, periodo }))
    let creados = 0
    let errorMsg = null
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300)
      const { error } = await supabase.from(tabla).insert(chunk)
      if (error) { errorMsg = error.message; break }
      creados += chunk.length
    }
    setLoading(false)
    onBusy?.(false)
    if (errorMsg) {
      toast.error(
        creados > 0
          ? `Se crearon ${creados} de ${rows.length} antes de un error: ${errorMsg}`
          : `Error al importar: ${errorMsg}`
      )
      if (creados > 0) { reset(); onDone() }
    } else {
      toast.success(`${creados} registros creados en ${label}.`)
      reset()
      onDone()
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
      >
        <Upload size={15} />
        Importar Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">Carga masiva por Excel — {label}</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {!preview && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Descarga la plantilla para respetar el orden y los encabezados de las columnas,
                  complétala y súbela. Se <strong>crearán</strong> los trabajadores nuevos del mes
                  actual; se omitirán los DNI que ya existan este mes (en esta u otra planilla).
                  Los totales (Ingreso/Descuentos/Líquido) los calcula el sistema automáticamente.
                </p>
                <div className="flex gap-2 mb-1 items-center">
                  <button
                    onClick={descargarPlantilla}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    <Download size={14} />
                    Descargar plantilla
                  </button>
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={loading || cargandoFilas}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    <Upload size={14} />
                    {loading ? 'Leyendo…' : 'Subir Excel'}
                  </button>
                  {cargandoFilas && (
                    <span className="text-xs text-gray-400">Cargando registros…</span>
                  )}
                </div>
              </>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{preview.crear.length}</p>
                    <p className="text-xs text-green-600">Se crearán</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${preview.yaExisten.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.yaExisten.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                    <p className={`text-2xl font-bold ${preview.yaExisten.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>{preview.yaExisten.length}</p>
                    <p className={`text-xs ${preview.yaExisten.length > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Ya existen aquí</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${preview.conflictos.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.conflictos.length > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                    <p className={`text-2xl font-bold ${preview.conflictos.length > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{preview.conflictos.length}</p>
                    <p className={`text-xs ${preview.conflictos.length > 0 ? 'text-orange-600' : 'text-gray-500'}`}>En otra planilla</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${preview.invalidas.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <AlertTriangle size={20} className={`mx-auto mb-1 ${preview.invalidas.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                    <p className={`text-2xl font-bold ${preview.invalidas.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>{preview.invalidas.length}</p>
                    <p className={`text-xs ${preview.invalidas.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Filas inválidas</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-1">Trabajadores a crear:</p>
                <div className="border rounded-lg overflow-hidden mb-3 max-h-44 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">DNI</th>
                        <th className="px-2 py-1.5 text-left">Apellidos y Nombres</th>
                        {columnasImportables.some((c) => c.key === 'area') && (
                          <th className="px-2 py-1.5 text-left">Área</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.crear.slice(0, 50).map((r, i) => (
                        <tr key={r.dni} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{r.dni}</td>
                          <td className="px-2 py-1">{r.apellidos_y_nombres}</td>
                          {columnasImportables.some((c) => c.key === 'area') && (
                            <td className="px-2 py-1">{r.area || '—'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.crear.length > 50 && (
                  <p className="text-xs text-gray-400 mb-2">… y {preview.crear.length - 50} más.</p>
                )}

                {preview.yaExisten.length > 0 && (
                  <p className="text-xs text-amber-600 mb-2">
                    Ya existen este mes en {label} (se omiten):{' '}
                    {preview.yaExisten.slice(0, 15).map((r) => r.dni).join(', ')}
                    {preview.yaExisten.length > 15 ? `, … (+${preview.yaExisten.length - 15})` : ''}
                  </p>
                )}
                {preview.conflictos.length > 0 && (
                  <p className="text-xs text-orange-600 mb-2">
                    Ya registrados este mes en otra planilla (se omiten):{' '}
                    {preview.conflictos.slice(0, 15).map((r) => `${r.dni} (${r.tabla})`).join(', ')}
                    {preview.conflictos.length > 15 ? `, … (+${preview.conflictos.length - 15})` : ''}
                  </p>
                )}
                {preview.invalidas.length > 0 && (
                  <p className="text-xs text-red-600 mb-2">
                    Filas inválidas: {preview.invalidas.slice(0, 15).map((r) => `fila ${r.fila} (${r.motivo})`).join('; ')}
                    {preview.invalidas.length > 15 ? `, … (+${preview.invalidas.length - 15})` : ''}
                  </p>
                )}

                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => setPreview(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || preview.crear.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    {loading ? 'Creando…' : `Confirmar (${preview.crear.length})`}
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
