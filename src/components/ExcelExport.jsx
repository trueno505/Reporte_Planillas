import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

export default function ExcelExport({ planilla, filas }) {
  const handleExport = () => {
    const { columnas, label } = planilla
    const data = filas.map((fila) =>
      Object.fromEntries(columnas.map((c) => [c.label, fila[c.key] ?? '']))
    )
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
    XLSX.writeFile(wb, `${label}.xlsx`)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-primary hover:text-white transition"
    >
      <Download size={15} />
      Exportar Excel
    </button>
  )
}
