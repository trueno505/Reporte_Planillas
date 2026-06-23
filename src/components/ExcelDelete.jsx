import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'

export default function ExcelDelete({ planilla, onDone, onBusy }) {
  const { tabla, label } = planilla
  const inputRef = useRef()
  const [dnis, setDnis] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
      const found = rows
        .map((r) => {
          const v = r['DNI'] ?? r['dni'] ?? Object.values(r)[0]
          return parseInt(String(v).trim(), 10)
        })
        .filter((n) => !isNaN(n))
      if (found.length === 0) { toast.error('No se encontraron DNIs válidos en el archivo.'); return }
      setDnis(found)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirm = async () => {
    setLoading(true)
    onBusy?.(true)
    // .delete().in(...) es una sola sentencia → atómica
    const { error } = await supabase.from(tabla).delete().in('dni', dnis)
    setLoading(false)
    onBusy?.(false)
    setDnis(null)
    if (error) toast.error(error.message)
    else { toast.success(`${dnis.length} registros eliminados de ${label}.`); onDone() }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-60"
      >
        <Trash2 size={15} />
        {loading ? 'Eliminando…' : 'Eliminar por Excel'}
      </button>

      {dnis && (
        <ConfirmDialog
          title="Confirmar eliminación masiva"
          message={`Se eliminarán ${dnis.length} registros (por DNI) de la planilla "${label}". Esta acción no se puede deshacer.`}
          danger
          onConfirm={handleConfirm}
          onCancel={() => setDnis(null)}
        />
      )}
    </>
  )
}
