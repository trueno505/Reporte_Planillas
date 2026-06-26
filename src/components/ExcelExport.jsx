import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'
import { fetchAllRows } from '../lib/db'
import toast from 'react-hot-toast'

export default function ExcelExport({ planilla }) {
  const [loading, setLoading] = useState(false)

  // La tabla en pantalla está paginada (50 filas), pero la exportación debe
  // incluir TODOS los registros: los traemos bajo demanda al hacer clic.
  const handleExport = async () => {
    const { columnas, label, tabla } = planilla
    setLoading(true)
    let filas
    try {
      filas = await fetchAllRows(tabla, { order: 'apellidos_y_nombres' })
    } catch (e) {
      setLoading(false)
      toast.error(`No se pudo exportar: ${e.message}`)
      return
    }

    const data = filas.map((fila) =>
      Object.fromEntries(columnas.map((c) => [c.label, fila[c.key] ?? '']))
    )
    const ws = XLSX.utils.json_to_sheet(
      data.length ? data : [Object.fromEntries(columnas.map((c) => [c.label, '']))]
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
    XLSX.writeFile(wb, `${label}.xlsx`)
    setLoading(false)
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-primary hover:text-white transition disabled:opacity-60"
    >
      <Download size={15} />
      {loading ? 'Exportando…' : 'Exportar Excel'}
    </button>
  )
}
