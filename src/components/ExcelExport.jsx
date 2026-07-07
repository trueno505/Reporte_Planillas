import { useState } from 'react'
import XLSX from 'xlsx-js-style'
import { Download } from 'lucide-react'
import { fetchAllRows } from '../lib/db'
import { formatPeriodo } from '../lib/periodo'
import { construirHojaPlanilla, construirHojaResumenAreas } from '../lib/excelEncabezado'
import toast from 'react-hot-toast'

export default function ExcelExport({ planilla, periodo = null }) {
  const [loading, setLoading] = useState(false)

  // La tabla en pantalla está paginada (50 filas), pero la exportación debe
  // incluir TODOS los registros del mes: los traemos bajo demanda al hacer clic.
  const handleExport = async () => {
    const { label, tabla } = planilla
    setLoading(true)
    let filas
    try {
      filas = await fetchAllRows(tabla, { order: 'apellidos_y_nombres', periodo })
    } catch (e) {
      setLoading(false)
      toast.error(`No se pudo exportar: ${e.message}`)
      return
    }

    const ws = construirHojaPlanilla(planilla, filas, periodo)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
    const wsResumen = construirHojaResumenAreas(planilla, filas, periodo)
    if (wsResumen) XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por áreas'.slice(0, 31))
    const sufijo = periodo ? `_${formatPeriodo(periodo).replace(' ', '_')}` : ''
    XLSX.writeFile(wb, `${label}${sufijo}.xlsx`)
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
