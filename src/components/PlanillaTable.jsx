import { useMemo, useState, useCallback, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, Printer, AlertTriangle, Search } from 'lucide-react'
import { mapAlertasPlanilla } from '../lib/alertas'
import { imprimirBoletaMeses } from '../lib/imprimirBoleta'
import { supabase } from '../lib/supabaseClient'
import Paginacion from './Paginacion'
import BoletaMesesModal from './BoletaMesesModal'
import toast from 'react-hot-toast'

const TOTAL_KEYS = new Set(['t_ingreso', 't_dsctos', 't_liquido'])
const MONEY_FMT = (v) => Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })

function InlineCell({ value: initialValue, col, rowId, planilla, puedeEditar }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initialValue)
  // Enter llama a save() y desmonta el input, lo que puede disparar onBlur →
  // save() otra vez. Este guard evita enviar el UPDATE dos veces.
  const guardandoRef = useRef(false)

  const save = useCallback(async () => {
    if (guardandoRef.current) return
    guardandoRef.current = true
    setEditing(false)
    try {
      const vacio = val === '' || val === null || val === undefined
      let parsed = val
      if (vacio) {
        // Dejar la celda en blanco la vacía (NULL). Antes parseFloat('') daba
        // NaN y se revertía al valor anterior: no había forma de borrar un dato.
        parsed = null
      } else if (col.type === 'money' || col.type === 'dni' || col.type === 'int') {
        parsed = col.type === 'money' ? parseFloat(val) : parseInt(val, 10)
        if (isNaN(parsed)) {
          toast.error(`"${col.label}" debe ser un número.`)
          setVal(initialValue)
          return
        }
      }
      // Comparación laxa (==) a propósito: PostgREST puede devolver los NUMERIC
      // como string ("50.00") mientras `parsed` ya es número; con === se
      // reenviaría siempre el mismo valor. Cubre además null/undefined entre sí.
      if (parsed == initialValue) return

      // Solo enviamos el campo editado: el trigger de la BD recalcula los
      // totales de forma atómica, sin carreras entre ediciones simultáneas.
      const { error } = await supabase
        .from(planilla.tabla)
        .update({ [col.key]: parsed })
        .eq('id', rowId)
      if (error) { toast.error(error.message); setVal(initialValue) }
      else toast.success(`"${col.label}" actualizado.`)
    } finally {
      guardandoRef.current = false
    }
  }, [val, initialValue, col, rowId, planilla])

  const displayValue =
    initialValue === null || initialValue === undefined ? (
      <span className="text-gray-300">—</span>
    ) : col.type === 'money' ? (
      <span className={`tabular-nums ${TOTAL_KEYS.has(col.key) ? 'font-semibold text-primary' : ''}`}>
        {MONEY_FMT(initialValue)}
      </span>
    ) : (
      String(initialValue)
    )

  if (!puedeEditar || !['money', 'int', 'text'].includes(col.type) || TOTAL_KEYS.has(col.key)) {
    return displayValue
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={col.type === 'text' ? 'text' : 'number'}
        step={col.type === 'money' ? '0.01' : '1'}
        value={val ?? ''}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setEditing(false); setVal(initialValue) }
        }}
        className="w-full border border-primary rounded px-1 py-0.5 text-xs focus:outline-none"
        style={{ minWidth: 60 }}
      />
    )
  }

  return (
    <span
      onDoubleClick={() => { setVal(initialValue); setEditing(true) }}
      className="cursor-pointer hover:bg-blue-50 rounded px-0.5 -mx-0.5"
      title="Doble clic para editar"
    >
      {displayValue}
    </span>
  )
}

/**
 * Tabla de una planilla. La paginación, búsqueda y ordenamiento son del lado del
 * servidor (controlados por el componente padre vía `usePlanillaPaginada`):
 * `filas` son SOLO los registros de la página actual.
 */
export default function PlanillaTable({
  planilla,
  columnas,
  filas,
  onEdit,
  onDelete,
  puedeEditar,
  // Estado de paginación/búsqueda/orden controlado (server-side)
  search,
  onSearchChange,
  sort,
  onSortChange,
  page,
  pageCount,
  onPage,
  total,
  pageSize,
  loading,
}) {
  const alertasMap = useMemo(() => mapAlertasPlanilla(planilla, filas), [planilla, filas])
  const totalAlertas = alertasMap.size

  const [boletaFila, setBoletaFila] = useState(null)
  const [boletaCargando, setBoletaCargando] = useState(false)

  const seleccionarMeses = async (nMeses) => {
    setBoletaCargando(true)
    try {
      const { encontrados } = await imprimirBoletaMeses(planilla, boletaFila.dni, boletaFila.periodo, nMeses)
      if (encontrados < nMeses) {
        toast(`Solo se encontraron ${encontrados} de ${nMeses} mes(es) solicitados.`, { icon: '⚠️' })
      }
      setBoletaFila(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBoletaCargando(false)
    }
  }

  const columns = useMemo(
    () => [
      ...columnas.map((col) => ({
        accessorKey: col.key,
        header: col.label,
        cell: ({ getValue, row }) => (
          <InlineCell
            value={getValue()}
            col={col}
            rowId={row.original.id}
            planilla={planilla}
            puedeEditar={puedeEditar}
          />
        ),
        size: TOTAL_KEYS.has(col.key) ? 120 : col.type === 'money' ? 110 : col.type === 'text' ? 180 : 90,
      })),
      {
        id: 'acciones',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => {
          const alerts = alertasMap.get(row.original.id) ?? []
          return (
            <div className="flex gap-1 items-center">
              {alerts.length > 0 && (
                <span title={alerts.map((a) => a.mensaje).join('\n')}>
                  <AlertTriangle size={14} className="text-amber-500" />
                </span>
              )}
              <button
                onClick={() => setBoletaFila(row.original)}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 transition"
                title="Descargar boleta PDF"
              >
                <Printer size={13} />
              </button>
              {puedeEditar && (
                <>
                  <button
                    onClick={() => onEdit(row.original)}
                    className="px-2 py-1 text-xs rounded bg-primary text-white hover:bg-primary-light transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(row.original)}
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          )
        },
        size: puedeEditar ? 160 : 70,
      },
    ],
    [columnas, puedeEditar, onEdit, onDelete, alertasMap, planilla]
  )

  // El ordenamiento real lo hace el servidor; @tanstack solo arma las filas.
  const table = useReactTable({
    data: filas,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const buscando = search.trim().length > 0
  const sinFilas = filas.length === 0

  return (
    <div className="flex flex-col gap-3">
      {/* Panel de alertas */}
      {totalAlertas > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span>
            <strong>{totalAlertas}</strong> registro{totalAlertas > 1 ? 's' : ''} con alertas en esta página.
            Pasa el cursor sobre el ícono <AlertTriangle className="inline" size={12} /> en la fila para ver el detalle.
          </span>
        </div>
      )}

      {/* Barra de búsqueda (server-side: filtra toda la planilla) */}
      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {total} {total === 1 ? 'registro' : 'registros'}
          {buscando && ' (filtrados)'}
          {puedeEditar && <span className="text-gray-400 ml-1 text-xs">(doble clic en celda para editar)</span>}
        </span>
      </div>

      {/* Tabla con scroll horizontal */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm scrollbar-thin">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-primary text-white sticky top-0">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const colId = header.column.id
                  const sortable = colId !== 'acciones'
                  const activo = sort.key === colId
                  return (
                    <th
                      key={header.id}
                      onClick={sortable ? () => onSortChange(colId) : undefined}
                      style={{ width: header.column.columnDef.size }}
                      className={`px-3 py-2 text-left text-xs font-semibold whitespace-nowrap select-none hover:bg-primary-light
                        ${TOTAL_KEYS.has(colId) ? 'bg-primary-dark' : ''}
                        ${sortable ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable && (
                          <span className="opacity-70">
                            {activo && sort.ascending ? (
                              <ChevronUp size={12} />
                            ) : activo && !sort.ascending ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronsUpDown size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {sinFilas ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {loading
                    ? 'Cargando…'
                    : buscando
                      ? 'Sin resultados para la búsqueda.'
                      : 'Aún no hay trabajadores en esta planilla.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => {
                const tieneAlerta = alertasMap.has(row.original.id)
                return (
                  <tr
                    key={row.id}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-surface'}
                      ${tieneAlerta ? 'ring-1 ring-inset ring-amber-300' : ''}
                      hover:bg-blue-50 transition`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 border-b border-gray-100 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación reutilizable (oculta con una sola página) */}
      <Paginacion
        page={page}
        pageCount={pageCount}
        onPage={onPage}
        total={total}
        pageSize={pageSize}
      />

      {boletaFila && (
        <BoletaMesesModal
          loading={boletaCargando}
          onSeleccionar={seleccionarMeses}
          onCancel={() => setBoletaFila(null)}
        />
      )}
    </div>
  )
}
