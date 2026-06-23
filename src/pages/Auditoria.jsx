import { useState, useEffect } from 'react'
import { Clock, Filter } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'

const ACCION_COLOR = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

function fmtFecha(s) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Auditoria() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTabla, setFiltroTabla] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [tablas, setTablas] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('auditoria')
      .select('*, perfiles(nombre)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar auditoría:', error)
          toast.error(`No se pudo cargar el historial: ${error.message}`)
        }
        const rows = data ?? []
        setRegistros(rows)
        setTablas([...new Set(rows.map((r) => r.tabla))].sort())
        setLoading(false)
      })
  }, [isAdmin])

  if (authLoading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const filtrados = registros.filter((r) => {
    if (filtroTabla && r.tabla !== filtroTabla) return false
    if (filtroAccion && r.accion !== filtroAccion) return false
    return true
  })

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-primary">Historial de cambios</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Registro de todas las inserciones, modificaciones y eliminaciones realizadas.
        </p>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filtroTabla}
              onChange={(e) => setFiltroTabla(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              <option value="">Todas las planillas</option>
              {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">Todas las acciones</option>
            <option value="INSERT">INSERT (creación)</option>
            <option value="UPDATE">UPDATE (edición)</option>
            <option value="DELETE">DELETE (eliminación)</option>
          </select>
          <span className="text-sm text-gray-500 self-center ml-auto">
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No hay registros de auditoría aún.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-primary text-white text-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Fecha</th>
                    <th className="px-4 py-2.5 text-left">Planilla</th>
                    <th className="px-4 py-2.5 text-left">Acción</th>
                    <th className="px-4 py-2.5 text-left">Usuario</th>
                    <th className="px-4 py-2.5 text-left">DNI</th>
                    <th className="px-4 py-2.5 text-left">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r, i) => {
                    const datos = r.datos_nue ?? r.datos_ant ?? {}
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtFecha(r.created_at)}</td>
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{r.tabla.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ACCION_COLOR[r.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.accion}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{r.perfiles?.nombre ?? '—'}</td>
                        <td className="px-4 py-2 tabular-nums">{datos.dni ?? '—'}</td>
                        <td className="px-4 py-2">{datos.apellidos_y_nombres ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
