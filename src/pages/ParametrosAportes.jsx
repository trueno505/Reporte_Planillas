import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Percent, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { supabase } from '../lib/supabaseClient'
import { invalidarCacheAportes } from '../hooks/useParametrosAportes'
import Layout from '../components/Layout'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

const AFPS = ['Integra', 'Profuturo', 'Habitat', 'Prima']

// Etiquetas de las columnas de planilla donde aterriza cada porcentaje.
const CONCEPTOS = {
  descuento_snp: 'Descuento S.N.P.',
  f_pens: 'F. Pens. (Fondo de Pensiones)',
  p_seg: 'P. Seg. (Prima de Seguro)',
  c_var: 'C. Var. (Comisión Variable)',
}

const claveDe = (p) => `${p.sistema}|${p.afp ?? ''}|${p.concepto}`

export default function ParametrosAportes() {
  const { isSuperadmin, loading: authLoading } = useAuth()
  const [filas, setFilas] = useState([])
  const [edicion, setEdicion] = useState({}) // clave → valor en el input
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (!isSuperadmin) return
    supabase
      .from('parametros_aportes')
      .select('id, sistema, afp, concepto, porcentaje, actualizado_en')
      .then(({ data, error }) => {
        if (error) toast.error(`No se pudieron cargar los parámetros: ${error.message}`)
        else setFilas(data ?? [])
        setLoading(false)
      })
  }, [isSuperadmin])

  const valorDe = (p) => edicion[claveDe(p)] ?? String(p.porcentaje)

  const setValor = (p, v) => {
    // Solo dígitos y un punto decimal: evita que se cuele texto en un %.
    const limpio = v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    setEdicion((prev) => ({ ...prev, [claveDe(p)]: limpio }))
  }

  // Filas realmente modificadas y válidas.
  const cambios = useMemo(
    () =>
      filas
        .map((p) => ({ p, v: parseFloat(valorDe(p)) }))
        .filter(({ p, v }) => Number.isFinite(v) && v !== Number(p.porcentaje)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filas, edicion]
  )

  const invalidos = filas.filter((p) => {
    const v = parseFloat(valorDe(p))
    return !Number.isFinite(v) || v < 0 || v > 100
  })

  const guardar = async () => {
    setGuardando(true)
    let ok = 0
    let errorMsg = null
    for (const { p, v } of cambios) {
      const { error } = await supabase
        .from('parametros_aportes')
        .update({ porcentaje: v, actualizado_en: new Date().toISOString() })
        .eq('id', p.id)
      if (error) { errorMsg = error.message; break }
      ok++
    }
    setGuardando(false)
    setConfirmar(false)

    if (errorMsg) {
      toast.error(`Se guardaron ${ok} de ${cambios.length}: ${errorMsg}`)
    } else {
      toast.success(`${ok} porcentaje(s) actualizado(s).`)
    }

    // La caché del front tenía los % viejos; hay que tirarla para que el
    // formulario previsualice con los nuevos.
    invalidarCacheAportes()
    setEdicion({})
    const { data } = await supabase
      .from('parametros_aportes')
      .select('id, sistema, afp, concepto, porcentaje, actualizado_en')
    setFilas(data ?? [])
  }

  if (authLoading) return null
  if (!isSuperadmin) return <Navigate to="/dashboard" replace />

  const onp = filas.find((p) => p.sistema === 'ONP')
  const porAfp = (afp, concepto) =>
    filas.find((p) => p.sistema === 'AFP' && p.afp === afp && p.concepto === concepto)

  const celdaPct = (p) =>
    !p ? (
      <span className="text-gray-300">—</span>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <input
          value={valorDe(p)}
          onChange={(e) => setValor(p, e.target.value)}
          inputMode="decimal"
          className={`w-20 text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
            edicion[claveDe(p)] !== undefined && parseFloat(valorDe(p)) !== Number(p.porcentaje)
              ? 'border-amber-400 bg-amber-50 font-semibold'
              : 'border-gray-200'
          }`}
        />
        <span className="text-gray-400 text-xs">%</span>
      </div>
    )

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-1">
          <Percent className="text-primary" size={20} />
          <h1 className="text-xl font-semibold text-primary">Porcentajes de aportes previsionales</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Se aplican sobre el <strong>Total de Ingresos</strong> de cada trabajador. Al guardar, los
          montos se recalculan solos la próxima vez que se grabe cada registro. Solo el superadmin
          puede modificar esta página.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : (
          <div className="space-y-8">
            {/* ONP */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">ONP</h2>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Concepto</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-40">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2">{CONCEPTOS.descuento_snp}</td>
                    <td className="px-3 py-2">{celdaPct(onp)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* AFP */}
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">AFP</h2>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">A.F.P.</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Fdo. Pens.</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Pri. Seg.</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Com. Var.</th>
                  </tr>
                </thead>
                <tbody>
                  {AFPS.map((afp) => (
                    <tr key={afp} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{afp}</td>
                      <td className="px-3 py-2">{celdaPct(porAfp(afp, 'f_pens'))}</td>
                      <td className="px-3 py-2">{celdaPct(porAfp(afp, 'p_seg'))}</td>
                      <td className="px-3 py-2">{celdaPct(porAfp(afp, 'c_var'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Com. Var.</strong> solo se descuenta a quien tenga «Comisión sobre el flujo».
                Con «Comisión sobre el saldo» se aplican únicamente Fdo. Pens. y Pri. Seg.
              </p>
            </section>

            {invalidos.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Hay {invalidos.length} porcentaje(s) fuera del rango 0–100 o vacíos.</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmar(true)}
                disabled={guardando || cambios.length === 0 || invalidos.length > 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Save size={15} />
                Guardar {cambios.length > 0 && `(${cambios.length})`}
              </button>
              {cambios.length > 0 && (
                <button
                  onClick={() => setEdicion({})}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                >
                  <RotateCcw size={14} />
                  Descartar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmar && (
        <ConfirmDialog
          title="Cambiar porcentajes de aportes"
          message={`Vas a modificar ${cambios.length} porcentaje(s). Afecta el cálculo de descuentos de todas las planillas a partir del próximo guardado de cada registro.`}
          onCancel={() => setConfirmar(false)}
          onConfirm={guardar}
          loading={guardando}
          danger
        />
      )}
    </Layout>
  )
}
