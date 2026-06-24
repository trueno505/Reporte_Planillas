import { useState, useEffect } from 'react'
import { UserCog, ShieldCheck, Pencil, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'

// Los tres roles del sistema. La seguridad real la impone RLS en la BD; aquí
// solo se asigna el valor de perfiles.rol.
const ROLES = [
  {
    id: 'administrador',
    label: 'Administrador',
    desc: 'Control total: edita datos y gestiona usuarios.',
    Icon: ShieldCheck,
    badge: 'bg-primary text-white',
  },
  {
    id: 'editor',
    label: 'Editor',
    desc: 'Edita los datos de las planillas, pero no gestiona usuarios.',
    Icon: Pencil,
    badge: 'bg-amber-500 text-white',
  },
  {
    id: 'consultor',
    label: 'Consultor',
    desc: 'Solo consulta y exporta; no modifica datos.',
    Icon: Eye,
    badge: 'bg-gray-100 text-gray-600',
  },
]

const ROL_INFO = Object.fromEntries(ROLES.map((r) => [r.id, r]))

function fmtFecha(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-PE')
}

export default function Usuarios() {
  const { isAdmin, perfil, loading: authLoading } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = () => {
    supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar perfiles:', error)
          toast.error(`No se pudieron cargar los usuarios: ${error.message}`)
        }
        setPerfiles(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { if (isAdmin) cargar() }, [isAdmin])

  if (authLoading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const cambiarRol = async (id, nuevoRol) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success(`Rol actualizado a "${nuevoRol}".`)
      cargar()
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <UserCog size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-primary">Gestión de usuarios</h1>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Asigna a cada usuario uno de los tres roles.
        </p>

        {/* Leyenda de roles */}
        <div className="grid sm:grid-cols-3 gap-2 mb-6">
          {ROLES.map(({ id, label, desc, Icon, badge }) => (
            <div key={id} className="rounded-lg border border-gray-200 bg-white p-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge}`}>
                <Icon size={12} />
                {label}
              </span>
              <p className="text-xs text-gray-500 mt-2">{desc}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : perfiles.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No hay perfiles registrados aún.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-primary text-white text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Nombre</th>
                  <th className="px-4 py-2.5 text-left">Registrado</th>
                  <th className="px-4 py-2.5 text-left">Rol actual</th>
                  <th className="px-4 py-2.5 text-left">Cambiar rol</th>
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p, i) => {
                  const info = ROL_INFO[p.rol] ?? ROL_INFO.consultor
                  const esMiPerfil = p.id === perfil?.id
                  const Icon = info.Icon
                  return (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {p.nombre ?? '—'}
                        {esMiPerfil && <span className="text-gray-400 font-normal"> (tú)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtFecha(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${info.badge}`}
                        >
                          <Icon size={12} />
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.rol}
                          disabled={esMiPerfil}
                          onChange={(e) => cambiarRol(p.id, e.target.value)}
                          title={esMiPerfil ? 'No puedes cambiar tu propio rol' : 'Cambiar rol del usuario'}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
