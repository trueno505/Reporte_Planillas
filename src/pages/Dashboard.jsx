import { Link } from 'react-router-dom'
import { Users, FileText, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { PLANILLAS, GRUPOS, getPlanillaByTabla } from '../config/planillas'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabaseClient'
import { cargarDatosConsolidado, generarReporteConsolidado } from '../lib/reporteConsolidado'
import { periodoActual, formatPeriodo } from '../lib/periodo'
import SiafModal from '../components/SiafModal'
import toast from 'react-hot-toast'

const GRUPO_ICON = {
  Obreros: '👷',
  Empleados: '🧑‍💼',
  CAS: '📋',
  Pensionistas: '🏦',
  Autoridades: '🏛️',
}

const GRUPO_COLOR = {
  Obreros: '#003366',
  Empleados: '#0055aa',
  CAS: '#1a7abf',
  Pensionistas: '#2d9c8a',
  Autoridades: '#6b3fa0',
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Dashboard() {
  const { perfil, puedeEditar } = useAuth()
  const [resumen, setResumen] = useState([])
  const [loadingResumen, setLoadingResumen] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [periodo, setPeriodo] = useState(periodoActual())
  // Datos ya descargados a la espera de los Nº Siaf: { datos, grupos }
  const [siafPendiente, setSiafPendiente] = useState(null)

  useEffect(() => {
    setLoadingResumen(true)
    supabase.rpc('resumen_planillas', { p_periodo: periodo }).then(({ data, error }) => {
      if (error) {
        // Antes se ignoraba: los KPIs quedaban en 0 como si no hubiera datos.
        console.error('Error al cargar el resumen:', error)
        toast.error(`No se pudo cargar el resumen: ${error.message}`)
        setResumen([])
      } else {
        // Enriquecer con label de la config
        setResumen((data ?? []).map((r) => ({
          ...r,
          label: getPlanillaByTabla(r.tabla)?.label ?? r.tabla,
          grupo: getPlanillaByTabla(r.tabla)?.grupo ?? 'Otros',
        })))
      }
      setLoadingResumen(false)
    })
  }, [periodo])

  const totalLiquido = resumen.reduce((a, r) => a + Number(r.suma_liquido ?? 0), 0)
  const totalTrabajadores = resumen.reduce((a, r) => a + Number(r.n_registros ?? 0), 0)

  // Datos para el gráfico: suma por grupo
  const chartData = GRUPOS.map((grupo) => ({
    grupo,
    liquido: resumen
      .filter((r) => r.grupo === grupo)
      .reduce((a, r) => a + Number(r.suma_liquido ?? 0), 0),
  })).filter((d) => d.liquido > 0)

  const handleExportar = async () => {
    setExportando(true)
    try {
      const datos = await cargarDatosConsolidado(periodo)

      // Si alguna planilla no se pudo descargar, avisamos ANTES de generar: su
      // hoja saldría vacía y el reporte es un documento oficial.
      const fallidas = datos.filter((d) => d.error)
      if (fallidas.length) {
        toast.error(
          `No se pudieron leer ${fallidas.length} planilla(s): ` +
          `${fallidas.map((d) => d.planilla.label).join(', ')}. ` +
          'Sus hojas saldrán vacías.',
          { duration: 8000 },
        )
      }

      // Planillas con áreas que llevan cuadro presupuestal → pedir Nº Siaf.
      const grupos = datos
        .filter((d) => d.areas.length > 0)
        .map((d) => ({ id: d.planilla.slug, label: d.planilla.label, areas: d.areas }))
      if (grupos.length > 0) {
        setSiafPendiente({ datos, grupos })
      } else {
        generarReporteConsolidado(resumen, periodo, datos)
      }
    } catch (e) {
      // Antes no había catch: un fallo aquí no mostraba absolutamente nada.
      console.error('Error al generar el reporte consolidado:', e)
      toast.error(`No se pudo generar el reporte: ${e.message}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <Layout>
      {siafPendiente && (
        <SiafModal
          titulo="Nº Siaf por planilla — Reporte consolidado"
          grupos={siafPendiente.grupos}
          onCancel={() => setSiafPendiente(null)}
          onConfirm={(valores) => {
            try {
              generarReporteConsolidado(resumen, periodo, siafPendiente.datos, valores)
            } catch (e) {
              console.error('Error al generar el reporte consolidado:', e)
              toast.error(`No se pudo generar el reporte: ${e.message}`)
            }
            setSiafPendiente(null)
          }}
        />
      )}
      <div className="max-w-5xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel de Planillas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Bienvenido/a, <strong>{perfil?.nombre}</strong>. Rol:{' '}
              <span className={`font-semibold ${puedeEditar ? 'text-primary' : 'text-gray-600'}`}>
                {perfil?.rol}
              </span>{' '}
              · Mes: <strong className="text-gray-700">{formatPeriodo(periodo)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={periodo.slice(0, 7)}
              onChange={(e) => setPeriodo(e.target.value ? `${e.target.value}-01` : periodoActual())}
              title="Mes a consultar"
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleExportar}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-light transition disabled:opacity-60"
            >
              {exportando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exportando ? 'Generando…' : 'Reporte consolidado'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <FileText size={22} className="text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{PLANILLAS.length}</p>
              <p className="text-xs text-gray-500">Planillas</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <Users size={22} className="text-green-600" />
            <div>
              {loadingResumen ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : (
                <p className="text-2xl font-bold text-green-700">{totalTrabajadores.toLocaleString()}</p>
              )}
              <p className="text-xs text-gray-500">Trabajadores</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <img src="/icono_moneda.png" alt="" className="w-[22px] h-[22px] object-contain shrink-0" />
            <div>
              {loadingResumen ? (
                <Loader2 size={20} className="animate-spin text-gray-400" />
              ) : (
                <p className="text-lg font-bold text-blue-700">S/ {fmt(totalLiquido)}</p>
              )}
              <p className="text-xs text-gray-500">Total a pagar</p>
            </div>
          </div>
        </div>

        {/* Gráfico por grupo */}
        {!loadingResumen && chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Total líquido por grupo (S/)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="grupo" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`S/ ${fmt(v)}`, 'Líquido']} />
                <Bar dataKey="liquido" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.grupo} fill={GRUPO_COLOR[entry.grupo] ?? '#003366'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla resumen */}
        {!loadingResumen && resumen.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Resumen por planilla</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-surface text-xs text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Planilla</th>
                    <th className="px-4 py-2 text-right">Trabajadores</th>
                    <th className="px-4 py-2 text-right">Total Ingreso</th>
                    <th className="px-4 py-2 text-right">Total Descuentos</th>
                    <th className="px-4 py-2 text-right font-bold text-primary">Total Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((r, i) => (
                    <tr key={r.tabla} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                      <td className="px-4 py-2">
                        <Link to={`/planilla/${getPlanillaByTabla(r.tabla)?.slug ?? ''}`} className="text-primary hover:underline">
                          {r.label}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.n_registros}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(r.suma_ingreso)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-red-600">{fmt(r.suma_dsctos)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{fmt(r.suma_liquido)}</td>
                    </tr>
                  ))}
                  <tr className="bg-primary text-white text-xs font-bold">
                    <td className="px-4 py-2">TOTAL GENERAL</td>
                    <td className="px-4 py-2 text-right">{totalTrabajadores.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{fmt(resumen.reduce((a, r) => a + Number(r.suma_ingreso ?? 0), 0))}</td>
                    <td className="px-4 py-2 text-right">{fmt(resumen.reduce((a, r) => a + Number(r.suma_dsctos ?? 0), 0))}</td>
                    <td className="px-4 py-2 text-right">{fmt(totalLiquido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tarjetas por grupo */}
        {GRUPOS.map((grupo) => {
          const items = PLANILLAS.filter((p) => p.grupo === grupo)
          return (
            <div key={grupo} className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <span>{GRUPO_ICON[grupo] ?? '📄'}</span>
                {grupo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((p) => {
                  const stats = resumen.find((r) => r.tabla === p.tabla)
                  return (
                    <Link
                      key={p.slug}
                      to={`/planilla/${p.slug}`}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition group"
                    >
                      <p className="font-semibold text-gray-800 group-hover:text-primary text-sm">{p.label}</p>
                      {stats ? (
                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>{stats.n_registros} trabajadores</span>
                          <span className="font-semibold text-primary">S/ {fmt(stats.suma_liquido)}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">{p.columnas.length} columnas</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
