import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { periodoActual, formatPeriodo } from '../lib/periodo'

function fmt(n) {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })
}

export default function BusquedaGlobal() {
  const [termino, setTermino] = useState('')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState('')

  const buscar = async (e) => {
    e.preventDefault()
    if (!termino.trim()) return
    setLoading(true)
    setBuscado(termino.trim())

    const { data, error } = await supabase.rpc('buscar_trabajador', { termino: termino.trim(), p_periodo: periodo })
    setLoading(false)

    if (error) {
      setResultados([])
    } else {
      setResultados(data ?? [])
    }
  }

  // Agrupar resultados por tabla
  const grupos = resultados
    ? resultados.reduce((acc, r) => {
        if (!acc[r.tabla]) acc[r.tabla] = { slug: r.slug, filas: [] }
        acc[r.tabla].filas.push(r)
        return acc
      }, {})
    : null

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">Búsqueda en todas las planillas</h1>
        <p className="text-gray-500 text-sm mb-6">
          Busca un trabajador por DNI o parte de su nombre en el mes elegido. Se consultan las 19 planillas simultáneamente.
        </p>

        <form onSubmit={buscar} className="flex flex-wrap gap-2 mb-6">
          <input
            type="month"
            value={periodo.slice(0, 7)}
            onChange={(e) => setPeriodo(e.target.value ? `${e.target.value}-01` : periodoActual())}
            title="Mes a buscar"
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Ingresa DNI o nombre…"
            className="flex-1 min-w-[12rem] border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !termino.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {!loading && grupos !== null && (
          <>
            {Object.keys(grupos).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Sin resultados para "{buscado}"</p>
                <p className="text-sm mt-1">Prueba con otro nombre o DNI.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  <strong className="text-gray-800">{resultados.length}</strong> coincidencia
                  {resultados.length !== 1 ? 's' : ''} en{' '}
                  <strong className="text-gray-800">{Object.keys(grupos).length}</strong> planilla
                  {Object.keys(grupos).length !== 1 ? 's' : ''} · mes{' '}
                  <strong className="text-gray-800">{formatPeriodo(periodo)}</strong>.
                </p>
                <div className="space-y-4">
                  {Object.entries(grupos).map(([tabla, { slug, filas }]) => (
                    <div key={tabla} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
                        <h2 className="text-white text-sm font-semibold">{tabla.replace(/_/g, ' ').toUpperCase()}</h2>
                        <Link
                          to={`/planilla/${slug}`}
                          className="text-blue-200 text-xs hover:text-white transition"
                        >
                          Ver planilla completa →
                        </Link>
                      </div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">DNI</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">Apellidos y Nombres</th>
                            <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">Líquido (S/)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filas.map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                              <td className="px-4 py-2 tabular-nums text-gray-600">{r.dni}</td>
                              <td className="px-4 py-2 font-medium text-gray-900">{r.apellidos_y_nombres}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-primary font-semibold">{fmt(r.t_liquido)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
