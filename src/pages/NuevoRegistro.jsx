import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FilePlus, Layers, Table2, ChevronRight, Check } from 'lucide-react'
import Layout from '../components/Layout'
import RecordForm from '../components/RecordForm'
import { PLANILLAS, GRUPOS, getPlanillaBySlug } from '../config/planillas'
import { useAuth } from '../context/auth-context'

function Paso({ n, titulo, activo, hecho }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${
          hecho
            ? 'bg-green-500 text-white'
            : activo
            ? 'bg-primary text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {hecho ? <Check size={14} /> : n}
      </div>
      <span className={`text-sm ${activo || hecho ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
        {titulo}
      </span>
    </div>
  )
}

export default function NuevoRegistro() {
  const { puedeEditar, loading } = useAuth()
  const [grupo, setGrupo] = useState(null)
  const [slug, setSlug] = useState(null)

  if (loading) return null
  // Crear registros es una acción de edición (admin o editor); RLS lo exige igualmente.
  if (!puedeEditar) return <Navigate to="/dashboard" replace />

  const planilla = slug ? getPlanillaBySlug(slug) : null
  const subplanillas = grupo ? PLANILLAS.filter((p) => p.grupo === grupo) : []

  const elegirGrupo = (g) => {
    setGrupo(g)
    setSlug(null)
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <FilePlus size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-primary">Nuevo registro</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Elige el grupo y la planilla; luego completa las columnas del trabajador.
        </p>

        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Paso n={1} titulo="Grupo" activo={!grupo} hecho={!!grupo} />
          <ChevronRight size={14} className="text-gray-300" />
          <Paso n={2} titulo="Planilla" activo={!!grupo && !slug} hecho={!!slug} />
          <ChevronRight size={14} className="text-gray-300" />
          <Paso n={3} titulo="Datos" activo={!!slug} hecho={false} />
        </div>

        {/* Paso 1: Grupo */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-primary" />
            <h2 className="font-semibold text-gray-700">1. ¿A qué grupo pertenece?</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GRUPOS.map((g) => {
              const n = PLANILLAS.filter((p) => p.grupo === g).length
              const activo = grupo === g
              return (
                <button
                  key={g}
                  onClick={() => elegirGrupo(g)}
                  className={`rounded-xl border p-4 text-left transition ${
                    activo
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-surface'
                  }`}
                >
                  <p className="font-semibold text-sm">{g}</p>
                  <p className={`text-xs mt-1 ${activo ? 'text-blue-100' : 'text-gray-400'}`}>
                    {n} planilla{n !== 1 ? 's' : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Paso 2: Planilla (subplanillas del grupo) */}
        {grupo && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Table2 size={16} className="text-primary" />
              <h2 className="font-semibold text-gray-700">
                2. ¿En qué planilla de <span className="text-primary">{grupo}</span>?
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subplanillas.map((p) => {
                const activo = slug === p.slug
                return (
                  <button
                    key={p.slug}
                    onClick={() => setSlug(p.slug)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                      activo
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-surface text-gray-700'
                    }`}
                  >
                    {p.label}
                    <ChevronRight size={15} className={activo ? 'text-primary' : 'text-gray-300'} />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Paso 3: hint */}
        {grupo && !slug && (
          <p className="text-center text-sm text-gray-400 py-6">
            Selecciona una planilla para completar los datos del trabajador.
          </p>
        )}
      </div>

      {/* Paso 3: formulario de columnas (modal reutilizado) */}
      {planilla && (
        <RecordForm
          planilla={planilla}
          record={null}
          soloBasicos
          onClose={() => setSlug(null)}
          onSaved={() => {}}
        />
      )}
    </Layout>
  )
}
