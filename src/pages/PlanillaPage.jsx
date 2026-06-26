import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { RefreshCw, Calculator } from 'lucide-react'
import Layout from '../components/Layout'
import PlanillaTable from '../components/PlanillaTable'
import RecordForm from '../components/RecordForm'
import ExcelExport from '../components/ExcelExport'
import ExcelActualizarColumna from '../components/ExcelActualizarColumna'
import ConfirmDialog from '../components/ConfirmDialog'
import { getPlanillaBySlug, getSeccionesCalculo } from '../config/planillas'
import { usePlanillaPaginada } from '../hooks/usePlanillaPaginada'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function PlanillaPage() {
  const { slug } = useParams()
  const planilla = getPlanillaBySlug(slug)
  const { puedeEditar } = useAuth()

  const {
    filas, total, loading, error, refetch,
    page, setPage, pageCount, pageSize,
    search, setSearch, sort, setSort,
  } = usePlanillaPaginada(planilla?.tabla)

  const [formRecord, setFormRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  // Realtime: ante cualquier INSERT/UPDATE/DELETE de ESTA planilla refrescamos
  // la página y el conteo actuales (paginación server-side). Agrupamos ráfagas
  // de eventos con un pequeño debounce para no recargar varias veces seguidas.
  const refetchRef = useRef(refetch)
  useEffect(() => { refetchRef.current = refetch })
  const debounceRef = useRef(null)
  const onRealtime = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => refetchRef.current(), 200)
  }, [])
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // Pausa Realtime mientras corre una operación masiva (importar/recalcular/borrar).
  // El canal escucha solo la tabla de esta planilla (filtrado por planilla) y se
  // limpia al desmontar o cambiar de planilla (ver useRealtime).
  useRealtime(planilla?.tabla, onRealtime, !bulkBusy)

  const handleEdit = useCallback((row) => setFormRecord(row), [])
  const handleDeleteClick = useCallback((row) => setDeleteTarget(row), [])

  const handleRecalcular = useCallback(async () => {
    if (!getSeccionesCalculo(planilla)) return
    setRecalculating(true)
    setBulkBusy(true)
    // Recálculo atómico en la BD: un UPDATE que dispara el trigger de totales.
    const { data, error } = await supabase.rpc('recalcular_totales', {
      p_tabla: planilla.tabla,
    })
    setRecalculating(false)
    setBulkBusy(false)
    if (error) toast.error(`Error al recalcular: ${error.message}`)
    else toast.success(`${data ?? total} registros recalculados correctamente.`)
    refetch()
  }, [planilla, total, refetch])

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    const { error: err } = await supabase
      .from(planilla.tabla)
      .delete()
      .eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (err) toast.error(err.message)
    else toast.success('Registro eliminado.')
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
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} />
              Recargar
            </button>

            <ExcelExport planilla={planilla} />

            {puedeEditar && (
              <>
                <ExcelActualizarColumna planilla={planilla} onDone={refetch} onBusy={setBulkBusy} />
                {getSeccionesCalculo(planilla) && (
                  <button
                    onClick={handleRecalcular}
                    disabled={recalculating || total === 0}
                    title="Recalcular todos los totales de esta planilla"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 transition disabled:opacity-60"
                  >
                    <Calculator size={14} />
                    {recalculating ? 'Recalculando…' : 'Recalcular totales'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Estado de error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* La tabla queda siempre montada (no desmontamos en cada cambio de
            página/búsqueda para no perder el foco del buscador). El propio
            componente muestra "Cargando…" o el estado vacío según corresponda. */}
        {!error && (
          <PlanillaTable
            planilla={planilla}
            columnas={planilla.columnas}
            filas={filas}
            puedeEditar={puedeEditar}
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

      {/* Modal crear/editar */}
      {formRecord !== null && (
        <RecordForm
          planilla={planilla}
          record={formRecord?.id ? formRecord : null}
          onClose={() => setFormRecord(null)}
          onSaved={refetch}
        />
      )}

      {/* Confirmar eliminar fila */}
      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar registro"
          message={`¿Eliminar a "${deleteTarget.apellidos_y_nombres}" (DNI ${deleteTarget.dni})? Esta acción no se puede deshacer.`}
          danger
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  )
}
