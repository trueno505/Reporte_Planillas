import { useMemo, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Printer, AlertTriangle } from 'lucide-react'
import { mapAlertasPlanilla } from '../lib/alertas'
import { generarBoletaPdf } from '../lib/boletaPdf'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const TOTAL_KEYS = new Set(['t_ingreso', 't_dsctos', 't_liquido'])
const MONEY_FMT = (v) => Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })

function InlineCell({ value: initialValue, col, rowId, planilla, isAdmin }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initialValue)

  const save = useCallback(async () => {
    setEditing(false)
    let parsed = val
    if (col.type === 'money' || col.type === 'dni' || col.type === 'int') {
      parsed = col.type === 'money' ? parseFloat(val) : parseInt(val, 10)
      if (isNaN(parsed)) { setVal(initialValue); return }
    }
    if (parsed === initialValue) return

    // Solo enviamos el campo editado: el trigger de la BD recalcula los totales
    // de forma atómica, sin condiciones de carrera entre ediciones simultáneas.
    const { error } = await supabase
      .from(planilla.tabla)
      .update({ [col.key]: parsed })
      .eq('id', rowId)
    if (error) { toast.error(error.message); setVal(initialValue) }
    else toast.success(`"${col.label}" actualizado.`)
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

  if (!isAdmin || !['money', 'int', 'text'].includes(col.type) || TOTAL_KEYS.has(col.key)) {
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

export default function PlanillaTable({ planilla, columnas, filas, onEdit, onDelete, isAdmin }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })

  const alertasMap = useMemo(() => mapAlertasPlanilla(planilla, filas), [planilla, filas])
  const totalAlertas = alertasMap.size

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
            isAdmin={isAdmin}
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
                onClick={() => generarBoletaPdf(planilla, row.original)}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 transition"
                title="Descargar boleta PDF"
              >
                <Printer size={13} />
              </button>
              {isAdmin && (
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
        size: isAdmin ? 160 : 70,
      },
    ],
    [columnas, isAdmin, onEdit, onDelete, alertasMap, planilla]
  )

  const table = useReactTable({
    data: filas,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Panel de alertas */}
      {totalAlertas > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span>
            <strong>{totalAlertas}</strong> registro{totalAlertas > 1 ? 's' : ''} con alertas.
            Pasa el cursor sobre el ícono <AlertTriangle className="inline" size={12} /> en la fila para ver el detalle.
          </span>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Buscar en la planilla…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-sm text-gray-500 ml-auto">
          {table.getFilteredRowModel().rows.length} registros
          {isAdmin && <span className="text-gray-400 ml-1 text-xs">(doble clic en celda para editar)</span>}
        </span>
      </div>

      {/* Tabla con scroll horizontal */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm scrollbar-thin">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-primary text-white sticky top-0">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.column.columnDef.size }}
                    className={`px-3 py-2 text-left text-xs font-semibold whitespace-nowrap select-none hover:bg-primary-light
                      ${TOTAL_KEYS.has(header.column.id) ? 'bg-primary-dark' : ''}
                      ${header.column.getCanSort() ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="opacity-70">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp size={12} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronsUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  No hay registros en esta planilla.
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

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pagination.pageSize}
            onChange={(e) => setPagination((p) => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))}
            className="border border-gray-200 rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / página</option>
            ))}
          </select>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
