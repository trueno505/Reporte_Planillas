import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { RefreshCw, Calculator, CalendarPlus, Lock } from 'lucide-react'
import Layout from '../components/Layout'
import PlanillaTable from '../components/PlanillaTable'
import RecordForm from '../components/RecordForm'
import ExcelExport from '../components/ExcelExport'
import ExcelActualizarColumna from '../components/ExcelActualizarColumna'
import ExcelImportarMasivo from '../components/ExcelImportarMasivo'
import ConfirmDialog from '../components/ConfirmDialog'
import PeriodoSelector from '../components/PeriodoSelector'
import { getPlanillaBySlug, getSeccionesCalculo } from '../config/planillas'
import { usePlanillaPaginada } from '../hooks/usePlanillaPaginada'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabaseClient'
import { periodoActual, siguientePeriodo, formatPeriodo } from '../lib/periodo'
import toast from 'react-hot-toast'

export default function PlanillaPage() {
  const { slug } = useParams()
  const planilla = getPlanillaBySlug(slug)
  const { puedeEditar } = useAuth()

  // ── Periodos (meses) de esta planilla ──────────────────────────────────────
  // periodosReales = meses con datos (desc). El "abierto" (editable) es el más
  // reciente; los anteriores quedan en solo lectura.
  const [periodosReales, setPeriodosReales] = useState([])
  const [periodo, setPeriodo] = useState(null)

  // Filtro por área (solo planillas con `areas`); '' = todas.
  const [area, setArea] = useState('')

  // Al cambiar de planilla, recarga los meses y selecciona el abierto.
  useEffect(() => {
    setPeriodo(null)
    setPeriodosReales([])
    setArea('')
    if (!planilla?.tabla) return
    supabase.rpc('periodos_planilla', { p_tabla: planilla.tabla }).then(({ data, error }) => {
      if (error) { toast.error(`No se pudieron cargar los meses: ${error.message}`); return }
      const lista = (data ?? []).map((r) => String(r.periodo).slice(0, 10))
      setPeriodosReales(lista)
      setPeriodo(lista[0] ?? periodoActual())
    })
  }, [planilla?.tabla])

  const periodoAbierto = periodosReales[0] ?? periodoActual()
  const opcionesPeriodo = periodosReales.length ? periodosReales : [periodoActual()]
  const esAbierto = periodo === periodoAbierto
  const editable = puedeEditar && esAbierto

  const {
    filas, total, loading, error, refetch,
    page, setPage, pageCount, pageSize,
    search, setSearch, sort, setSort,
  } = usePlanillaPaginada(planilla?.tabla, { periodo, area })

  const [formRecord, setFormRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [generarOpen, setGenerarOpen] = useState(false)
  const [generando, setGenerando] = useState(false)

  // Realtime: ante cualquier INSERT/UPDATE/DELETE de ESTA planilla refrescamos
  // la página y el conteo actuales (paginación server-side). El refetch ya queda
  // acotado al periodo seleccionado, así que eventos de otros meses se ignoran.
  const refetchRef = useRef(refetch)
  useEffect(() => { refetchRef.current = refetch })
  const debounceRef = useRef(null)
  const onRealtime = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refetchRef.current(), 200)
  }, [])
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])
  useRealtime(planilla?.tabla, onRealtime, !bulkBusy)

  const handleEdit = useCallback((row) => setFormRecord(row), [])
  const handleDeleteClick = useCallback((row) => setDeleteTarget(row), [])

  const handleRecalcular = useCallback(async () => {
    if (!getSeccionesCalculo(planilla)) return
    setRecalculating(true)
    setBulkBusy(true)
    const { data, error } = await supabase.rpc('recalcular_totales', {
      p_tabla: planilla.tabla,
      p_periodo: periodo,
    })
    setRecalculating(false)
    setBulkBusy(false)
    if (error) toast.error(`Error al recalcular: ${error.message}`)
    else toast.success(`${data ?? total} registros recalculados correctamente.`)
    refetch()
  }, [planilla, periodo, total, refetch])

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    const { error: err } = await supabase
      .from(planilla.tabla)
      .delete()
      .eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (err) { toast.error(err.message); return }
    toast.success('Registro eliminado.')
    // Refresca explícitamente: Realtime también dispara un refetch, pero si la
    // tabla no está en la publicación o el WebSocket se cayó, la fila borrada
    // seguiría visible. El refetch es idempotente, así que duplicarlo no daña.
    refetch()
  }

  const nuevoMes = siguientePeriodo(periodoAbierto)
  const handleGenerarMes = async () => {
    setGenerando(true)
    setBulkBusy(true)
    const { data, error } = await supabase.rpc('abrir_periodo', {
      p_tabla: planilla.tabla,
      p_periodo: nuevoMes,
    })
    setGenerando(false)
    setBulkBusy(false)
    setGenerarOpen(false)
    if (error) {
      toast.error(`No se pudo generar el mes: ${error.message}`)
      return
    }
    toast.success(`Mes ${formatPeriodo(nuevoMes)} generado con ${data ?? 0} trabajadores.`)
    // Recarga la lista de meses y selecciona el nuevo (ahora abierto).
    setPeriodosReales((prev) => [nuevoMes, ...prev])
    setPeriodo(nuevoMes)
  }

  if (!planilla) return <Navigate to="/dashboard" replace />

  return (
    <Layout>
      <div className="max-w-full">
        {/* Título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-primary">{planilla.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Tabla: {planilla.tabla}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <PeriodoSelector
              periodos={opcionesPeriodo}
              value={periodo}
              onChange={setPeriodo}
            />

            {(planilla.areas?.length ?? 0) > 0 && (
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                title="Filtrar por área (actividad)"
                className="max-w-[16rem] truncate px-3 py-2 rounded-lg text-sm text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              >
                <option value="">Todas las áreas</option>
                {planilla.areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} />
              Recargar
            </button>

            <ExcelExport planilla={planilla} periodo={periodo} />

            {editable && (
              <>
                <ExcelImportarMasivo planilla={planilla} periodo={periodo} onDone={refetch} onBusy={setBulkBusy} />
                <ExcelActualizarColumna planilla={planilla} periodo={periodo} onDone={refetch} onBusy={setBulkBusy} />
                {getSeccionesCalculo(planilla) && (
                  <button
                    onClick={handleRecalcular}
                    disabled={recalculating || total === 0}
                    title="Recalcular todos los totales de este mes"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 transition disabled:opacity-60"
                  >
                    <Calculator size={14} />
                    {recalculating ? 'Recalculando…' : 'Recalcular totales'}
                  </button>
                )}
              </>
            )}

            {puedeEditar && esAbierto && periodosReales.length > 0 && (
              <button
                onClick={() => setGenerarOpen(true)}
                title={`Generar la planilla de ${formatPeriodo(nuevoMes)} copiando a los trabajadores`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-light transition"
              >
                <CalendarPlus size={14} />
                Generar mes siguiente
              </button>
            )}
          </div>
        </div>

        {/* Aviso de mes cerrado (solo lectura) */}
        {!esAbierto && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <Lock size={15} className="shrink-0" />
            <span>
              Estás viendo <strong>{formatPeriodo(periodo)}</strong>, un mes cerrado (solo
              lectura). El mes editable es <strong>{formatPeriodo(periodoAbierto)}</strong>.
            </span>
          </div>
        )}

        {/* Estado de error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!error && (
          <PlanillaTable
            planilla={planilla}
            columnas={planilla.columnas}
            filas={filas}
            puedeEditar={editable}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            page={page}
            pageCount={pageCount}
            onPage={setPage}
            total={total}
            pageSize={pageSize}
            loading={loading}
          />
        )}
      </div>

      {/* Modal editar (el periodo no cambia; la identidad va en solo lectura) */}
      {formRecord !== null && (
        <RecordForm
          planilla={planilla}
          record={formRecord?.id ? formRecord : null}
          periodo={periodo}
          onClose={() => setFormRecord(null)}
          onSaved={refetch}
        />
      )}

      {/* Confirmar eliminar fila */}
      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar registro"
          message={`¿Eliminar a "${deleteTarget.apellidos_y_nombres}" (DNI ${deleteTarget.dni}) del mes ${formatPeriodo(periodo)}? Esta acción no se puede deshacer.`}
          danger
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Confirmar generar mes siguiente */}
      {generarOpen && (
        <ConfirmDialog
          title={`Generar planilla de ${formatPeriodo(nuevoMes)}`}
          message={`Se creará el mes ${formatPeriodo(nuevoMes)} copiando todos los datos de ${formatPeriodo(periodoAbierto)} (montos, cargo, identidad, etc.). Las faltas quedarán en blanco para registrarlas de nuevo. ${formatPeriodo(periodoAbierto)} quedará como histórico de solo lectura.`}
          loading={generando}
          onConfirm={handleGenerarMes}
          onCancel={() => setGenerarOpen(false)}
        />
      )}
    </Layout>
  )
}
