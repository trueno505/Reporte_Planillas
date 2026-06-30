import { useState, useEffect } from 'react'
import { UserCog, ShieldCheck, Pencil, Eye, UserPlus, X, RefreshCw, KeyRound, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/ConfirmDialog'

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

// Genera una contraseña inicial razonable (12 caracteres, sin ambiguos).
function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  let out = ''
  const arr = new Uint32Array(12)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length]
  return out
}

// Modal para crear un nuevo usuario vía la Edge Function `crear-usuario`.
function NuevoUsuarioModal({ onClose, onCreado }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('consultor')
  const [password, setPassword] = useState(generarPassword())
  const [verPass, setVerPass] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error('Correo electrónico inválido.')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('crear-usuario', {
      body: { nombre: nombre.trim(), email: email.trim(), rol, password },
    })
    setEnviando(false)

    // En un error HTTP (4xx/5xx), supabase-js deja el Response en error.context;
    // el mensaje útil va en su cuerpo JSON ({ error: '...' }).
    if (error) {
      let msg = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) msg = body.error
      } catch { /* el cuerpo no era JSON */ }
      toast.error(msg)
      return
    }

    if (data?.warning) {
      toast(data.warning, { icon: '⚠️' })
    } else {
      toast.success(`Usuario "${data?.nombre ?? email}" creado.`)
    }
    onCreado()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
            <UserPlus size={18} /> Nuevo usuario
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@municipalidad.gob.pe"
              required
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ROL_INFO[rol].desc}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña inicial</label>
            <div className="flex gap-1.5">
              <input
                type={verPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setVerPass((v) => !v)}
                title={verPass ? 'Ocultar' : 'Mostrar'}
                className="px-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPassword(generarPassword())}
                title="Generar otra"
                className="px-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Anótala y compártela con el usuario; podrá cambiarla luego en «Mi perfil».
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {enviando ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para que el admin restablezca la contraseña de OTRO usuario vía la
// Edge Function `admin-usuarios` (acción cambiar_password).
function CambiarPasswordModal({ usuario, onClose }) {
  const [password, setPassword] = useState(generarPassword())
  const [verPass, setVerPass] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'cambiar_password', userId: usuario.id, password },
    })
    setEnviando(false)

    if (error) {
      let msg = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) msg = body.error
      } catch { /* el cuerpo no era JSON */ }
      toast.error(msg)
      return
    }

    toast.success(`Contraseña actualizada para "${usuario.nombre ?? 'el usuario'}".`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
            <KeyRound size={18} /> Cambiar contraseña
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Nueva contraseña para <span className="font-semibold">{usuario.nombre ?? '—'}</span>.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
            <div className="flex gap-1.5">
              <input
                type={verPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setVerPass((v) => !v)}
                title={verPass ? 'Ocultar' : 'Mostrar'}
                className="px-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPassword(generarPassword())}
                title="Generar otra"
                className="px-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Anótala y compártela con el usuario; podrá cambiarla luego en «Mi perfil».
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {enviando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { isAdmin, perfil, loading: authLoading } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [editarPass, setEditarPass] = useState(null)   // usuario al que se le cambia la clave
  const [aEliminar, setAEliminar] = useState(null)     // usuario pendiente de eliminar
  const [eliminando, setEliminando] = useState(false)

  const cargar = () => {
    Promise.all([
      supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
      // Los correos viven en auth.users; los trae la Edge Function (solo admin).
      supabase.functions.invoke('admin-usuarios', { body: { accion: 'listar' } }),
    ]).then(([perfilesRes, listaRes]) => {
      const { data, error } = perfilesRes
      if (error) {
        console.error('Error al cargar perfiles:', error)
        toast.error(`No se pudieron cargar los usuarios: ${error.message}`)
      }
      if (listaRes.error) {
        console.error('No se pudieron cargar los correos:', listaRes.error)
      }
      const emailPorId = Object.fromEntries(
        (listaRes.data?.usuarios ?? []).map((u) => [u.id, u.email]),
      )
      setPerfiles((data ?? []).map((p) => ({ ...p, email: emailPorId[p.id] ?? null })))
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

  const eliminarUsuario = async () => {
    if (!aEliminar) return
    setEliminando(true)
    const { error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: 'eliminar', userId: aEliminar.id },
    })
    setEliminando(false)

    if (error) {
      let msg = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) msg = body.error
      } catch { /* el cuerpo no era JSON */ }
      toast.error(msg)
      return
    }

    toast.success(`Usuario "${aEliminar.nombre ?? ''}" eliminado.`)
    setAEliminar(null)
    cargar()
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <UserCog size={20} className="text-primary" />
            <h1 className="text-2xl font-bold text-primary">Gestión de usuarios</h1>
          </div>
          <button
            onClick={() => setMostrarNuevo(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
          >
            <UserPlus size={16} /> Nuevo usuario
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Crea cuentas y asigna a cada usuario uno de los tres roles.
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="min-w-full text-sm whitespace-nowrap">
              <thead className="bg-primary text-white text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left">Nombre</th>
                  <th className="px-4 py-2.5 text-left">Correo</th>
                  <th className="px-4 py-2.5 text-left">Registrado</th>
                  <th className="px-4 py-2.5 text-left">Rol actual</th>
                  <th className="px-4 py-2.5 text-left">Cambiar rol</th>
                  <th className="px-4 py-2.5 text-left">Acciones</th>
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
                      <td className="px-4 py-3 text-gray-600">{p.email ?? '—'}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditarPass(p)}
                            title="Cambiar contraseña"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary border border-primary/30 hover:bg-primary/5"
                          >
                            <KeyRound size={14} /> Contraseña
                          </button>
                          <button
                            onClick={() => setAEliminar(p)}
                            disabled={esMiPerfil}
                            title={esMiPerfil ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarNuevo && (
        <NuevoUsuarioModal
          onClose={() => setMostrarNuevo(false)}
          onCreado={cargar}
        />
      )}

      {editarPass && (
        <CambiarPasswordModal
          usuario={editarPass}
          onClose={() => setEditarPass(null)}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          danger
          loading={eliminando}
          title="Eliminar usuario"
          message={`Se eliminará la cuenta de "${aEliminar.nombre ?? '—'}" de forma permanente. Esta acción no se puede deshacer.`}
          onConfirm={eliminarUsuario}
          onCancel={() => setAEliminar(null)}
        />
      )}
    </Layout>
  )
}
