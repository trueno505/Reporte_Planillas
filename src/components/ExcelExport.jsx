import { useState } from 'react'
import { Download } from 'lucide-react'
import { fetchAllRows } from '../lib/db'
import { formatPeriodo } from '../lib/periodo'
import { getCuadroArea } from '../config/cuadrosPresupuestales'
import SiafModal from './SiafModal'
import toast from 'react-hot-toast'

export default function ExcelExport({ planilla, periodo = null }) {
  const [loading, setLoading] = useState(false)
  // Cuando la planilla lleva cuadros presupuestales, antes de descargar se
  // pide el Nº Siaf de cada área presente en los datos del mes.
  const [pendiente, setPendiente] = useState(null) // { filas, areas: string[] }

  const descargar = async (filas, siafPorArea) => {
    const { label } = planilla
    // xlsx-js-style (~1.35 MB) y los constructores de hoja se cargan solo al
    // exportar, no en el bundle inicial.
    const [{ default: XLSX }, { construirHojaPlanilla, construirHojaResumenAreas, construirHojasDescuentos }] =
      await Promise.all([import('xlsx-js-style'), import('../lib/excelEncabezado')])

    const ws = construirHojaPlanilla(planilla, filas, periodo, siafPorArea)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31))
    const wsResumen = construirHojaResumenAreas(planilla, filas, periodo)
    if (wsResumen) XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por áreas'.slice(0, 31))

    // Una hoja aparte por cada concepto de descuento (Rimac, cooperativas...)
    // con al menos un trabajador afectado ese mes, para poder entregarla
    // directamente a cada entidad. Se evitan nombres de hoja repetidos.
    const nombresUsados = new Set(wb.SheetNames)
    for (const { nombre, hoja } of construirHojasDescuentos(planilla, filas, periodo)) {
      let nombreFinal = nombre || 'Descuento'
      let n = 2
      while (nombresUsados.has(nombreFinal)) {
        const sufijoN = ` (${n})`
        nombreFinal = `${nombre.slice(0, 31 - sufijoN.length)}${sufijoN}`
        n += 1
      }
      nombresUsados.add(nombreFinal)
      XLSX.utils.book_append_sheet(wb, hoja, nombreFinal)
    }

    const sufijo = periodo ? `_${formatPeriodo(periodo).replace(' ', '_')}` : ''
    XLSX.writeFile(wb, `${label}${sufijo}.xlsx`)
  }

  // La tabla en pantalla está paginada (50 filas), pero la exportación debe
  // incluir TODOS los registros del mes: los traemos bajo demanda al hacer clic.
  const handleExport = async () => {
    const { tabla, slug } = planilla
    setLoading(true)
    let filas
    try {
      filas = await fetchAllRows(tabla, { order: 'apellidos_y_nombres', periodo })
    } catch (e) {
      setLoading(false)
      toast.error(`No se pudo exportar: ${e.message}`)
      return
    }

    // Áreas presentes en los datos que tienen cuadro presupuestal configurado.
    let areas = []
    if (planilla.areas?.length) {
      areas = [...new Set(filas.map((f) => String(f.area ?? '').trim()).filter(Boolean))]
        .filter((a) => getCuadroArea(slug, a))
        .sort((a, b) => a.localeCompare(b, 'es'))
    } else if (getCuadroArea(slug, null)) {
      areas = ['*'] // cuadro único para toda la planilla
    }

    if (!areas.length) {
      try {
        await descargar(filas, {})
      } catch (e) {
        toast.error(`No se pudo generar el Excel: ${e.message}`)
      }
      setLoading(false)
      return
    }
    setPendiente({ filas, areas })
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-primary hover:text-white transition disabled:opacity-60"
      >
        <Download size={15} />
        {loading ? 'Exportando…' : 'Exportar Excel'}
      </button>

      {pendiente && (
        <SiafModal
          grupos={[{ id: planilla.slug, label: planilla.label, areas: pendiente.areas }]}
          onCancel={() => setPendiente(null)}
          onConfirm={(valores) => {
            setLoading(true)
            descargar(pendiente.filas, valores[planilla.slug] ?? {})
              .catch((e) => toast.error(`No se pudo generar el Excel: ${e.message}`))
              .finally(() => setLoading(false))
            setPendiente(null)
          }}
        />
      )}
    </>
  )
}
