import { useState, useEffect } from 'react'
import { UserCog, ShieldCheck, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'

function fmtFecha(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-PE')
}

export default function Usuarios() {
  const { isAdmin, loading: authLoading } = useAuth()
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
        <p className="text-gray-500 text-sm mb-6">
          Visualiza y cambia el rol de los usuarios registrados. Para crear nuevos usuarios,
          usa <strong>Authentication → Invite user</strong> en el panel de Supabase.
        </p>

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
                {perfiles.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtFecha(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                          p.rol === 'administrador'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.rol === 'administrador' ? <ShieldCheck size={12} /> : <Eye size={12} />}
                        {p.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.rol === 'administrador' ? (
                        <button
                          onClick={() => cambiarRol(p.id, 'consultor')}
                          className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Rebajar a consultor
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarRol(p.id, 'administrador')}
                          className="px-3 py-1 text-xs rounded border border-primary text-primary hover:bg-primary hover:text-white transition"
                        >
                          Promover a admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
