import { useState, useEffect } from 'react'
import { UserCog, ShieldCheck, Pencil, Eye, Crown, UserPlus, X, RefreshCw, KeyRound, Ban, CircleCheck } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/ConfirmDialog'

// Los cuatro roles del sistema. La seguridad real la impone RLS en la BD; aquí
// solo se asigna el valor de perfiles.rol.
const ROLES = [
  {
    id: 'superadmin',
    label: 'Superadmin',
    desc: 'Mismo control que Administrador. Su rol y su cuenta son permanentes: nadie puede cambiarlos, desactivarlos ni eliminarlos.',
    Icon: Crown,
    badge: 'bg-purple-700 text-white',
  },
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

// Roles asignables desde la app (crear usuario / cambiar rol). 'superadmin'
// queda fuera: esa cuenta es única y permanente, solo se crea a mano en la
// base de datos; nadie —ni siquiera otro superadmin— puede ascender a nadie
// a ese rol desde la UI (el trigger proteger_rol_perfil también lo bloquea
// en la BD como defensa en profundidad).
const ROLES_ASIGNABLES = ROLES.filter((r) => r.id !== 'superadmin')

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
              {ROLES_ASIGNABLES.map((r) => (
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
  const { isAdmin, isSuperadmin, perfil, loading: authLoading } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [editarPass, setEditarPass] = useState(null)   // usuario al que se le cambia la clave
  const [aDesactivar, setADesactivar] = useState(null) // usuario pendiente de desactivar
  const [procesando, setProcesando] = useState(false)

  const cargar = () => {
    Promise.all([
      supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
      // Correo y estado (activa/desactivada) viven en auth.users; los trae la
      // Edge Function (solo admin).
      supabase.functions.invoke('admin-usuarios', { body: { accion: 'listar' } }),
    ]).then(([perfilesRes, listaRes]) => {
      const { data, error } = perfilesRes
      if (error) {
        console.error('Error al cargar perfiles:', error)
        toast.error(`No se pudieron cargar los usuarios: ${error.message}`)
      }
      if (listaRes.error) {
        console.error('No se pudo cargar el estado de las cuentas:', listaRes.error)
      }
      const infoPorId = Object.fromEntries(
        (listaRes.data?.usuarios ?? []).map((u) => [u.id, u]),
      )
      const ahora = Date.now()
      setPerfiles((data ?? []).map((p) => {
        const u = infoPorId[p.id]
        const ban = u?.banned_until ? Date.parse(u.banned_until) : 0
        return { ...p, email: u?.email ?? null, activo: !(ban > ahora) }
      }))
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

  // Llama a la Edge Function para desactivar/activar y refresca la lista.
  const cambiarEstado = async (usuario, activar) => {
    setProcesando(true)
    const { error } = await supabase.functions.invoke('admin-usuarios', {
      body: { accion: activar ? 'activar' : 'desactivar', userId: usuario.id },
    })
    setProcesando(false)

    if (error) {
      let msg = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) msg = body.error
      } catch { /* el cuerpo no era JSON */ }
      toast.error(msg)
      return
    }

    toast.success(
      activar
        ? `Cuenta de "${usuario.nombre ?? ''}" activada.`
        : `Cuenta de "${usuario.nombre ?? ''}" desactivada.`,
    )
    setADesactivar(null)
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
          Crea cuentas y asigna a cada usuario un rol (Administrador, Editor o Consultor).
          El rol Superadmin no se puede asignar desde aquí: esa cuenta es única y permanente.
        </p>

        {/* Leyenda de roles. La tarjeta de Superadmin solo se muestra al propio
            superadmin: un administrador no debe saber que ese rol/cuenta existe. */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          {(isSuperadmin ? ROLES : ROLES_ASIGNABLES).map(({ id, label, desc, Icon, badge }) => (
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
                  <th className="px-4 py-2.5 text-left">Estado</th>
                  <th className="px-4 py-2.5 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p, i) => {
                  const info = ROL_INFO[p.rol] ?? ROL_INFO.consultor
                  const esMiPerfil = p.id === perfil?.id
                  const Icon = info.Icon
                  // El rol superadmin es permanente; y solo un superadmin puede
                  // (des)activar la cuenta de un administrador (Edge Function lo
                  // rechaza igual; esto solo evita el intento inútil en la UI).
                  const rolBloqueado = p.rol === 'superadmin'
                  const gestionRestringida = p.rol === 'administrador' && !isSuperadmin
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
                          disabled={esMiPerfil || rolBloqueado}
                          onChange={(e) => cambiarRol(p.id, e.target.value)}
                          title={
                            esMiPerfil ? 'No puedes cambiar tu propio rol'
                            : rolBloqueado ? 'El rol de superadmin es permanente y no se puede cambiar'
                            : 'Cambiar rol del usuario'
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {/* Si la fila ya es superadmin (rol bloqueado, select deshabilitado) se
                              incluye esa opción solo para que se siga viendo el rol actual. */}
                          {(rolBloqueado ? ROLES : ROLES_ASIGNABLES).map((r) => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {p.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                            <CircleCheck size={12} /> Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-600">
                            <Ban size={12} /> Desactivada
                          </span>
                        )}
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
                          {p.activo ? (
                            <button
                              onClick={() => setADesactivar(p)}
                              disabled={esMiPerfil || procesando || rolBloqueado || gestionRestringida}
                              title={
                                esMiPerfil ? 'No puedes desactivar tu propia cuenta'
                                : rolBloqueado ? 'La cuenta superadmin nunca se puede desactivar'
                                : gestionRestringida ? 'Solo un superadmin puede desactivar la cuenta de un administrador'
                                : 'Desactivar la cuenta (no podrá iniciar sesión)'
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-amber-700 border border-amber-300 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Ban size={14} /> Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => cambiarEstado(p, true)}
                              disabled={procesando || gestionRestringida}
                              title={gestionRestringida ? 'Solo un superadmin puede reactivar la cuenta de un administrador' : 'Reactivar la cuenta'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-green-700 border border-green-300 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CircleCheck size={14} /> Activar
                            </button>
                          )}
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

      {aDesactivar && (
        <ConfirmDialog
          danger
          loading={procesando}
          title="Desactivar usuario"
          message={`Se desactivará la cuenta de "${aDesactivar.nombre ?? '—'}": no podrá iniciar sesión hasta que la reactives. No se borra ningún dato.`}
          onConfirm={() => cambiarEstado(aDesactivar, false)}
          onCancel={() => setADesactivar(null)}
        />
      )}
    </Layout>
  )
}
