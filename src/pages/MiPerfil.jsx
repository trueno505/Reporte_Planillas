import { useState } from 'react'
import { UserCircle, ShieldCheck, Pencil, Eye, Save, KeyRound, Mail, Crown } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'
import { PASSWORD_MIN, validarPassword } from '../lib/password'
import { fmtFecha } from '../lib/formato'

const ROL_INFO = {
  superadmin: { label: 'Superadmin', Icon: Crown, badge: 'bg-purple-700 text-white' },
  administrador: { label: 'Administrador', Icon: ShieldCheck, badge: 'bg-primary text-white' },
  editor: { label: 'Editor', Icon: Pencil, badge: 'bg-amber-500 text-white' },
  consultor: { label: 'Consultor', Icon: Eye, badge: 'bg-gray-100 text-gray-600' },
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

// Formulario de nombre + celular. Se monta solo cuando `perfil` ya está cargado,
// por lo que su estado inicial siempre arranca con los valores correctos.
function FormDatosPersonales({ perfil, userId, refreshPerfil }) {
  const [nombre, setNombre] = useState(perfil.nombre ?? '')
  const [celular, setCelular] = useState(perfil.celular ?? '')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    const cel = celular.trim()
    // Validación ligera: si hay celular, que sean 9 dígitos (formato Perú).
    if (cel && !/^\d{9}$/.test(cel)) {
      toast.error('El celular debe tener 9 dígitos.')
      return
    }
    setGuardando(true)
    const { error } = await supabase
      .from('perfiles')
      .update({ nombre: nombre.trim() || null, celular: cel || null })
      .eq('id', userId)
    setGuardando(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Perfil actualizado.')
      refreshPerfil?.()
    }
  }

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h2 className="font-semibold text-gray-700 mb-4">Datos personales</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
          <input
            type="tel"
            inputMode="numeric"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="9 dígitos"
            maxLength={9}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-light transition disabled:opacity-60"
        >
          <Save size={15} />
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function FormPassword() {
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [cambiando, setCambiando] = useState(false)

  const cambiar = async (e) => {
    e.preventDefault()
    const errPass = validarPassword(pass1, pass2)
    if (errPass) {
      toast.error(errPass)
      return
    }
    setCambiando(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    setCambiando(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Contraseña actualizada.')
      setPass1('')
      setPass2('')
    }
  }

  return (
    <form onSubmit={cambiar} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={16} className="text-primary" />
        <h2 className="font-semibold text-gray-700">Cambiar contraseña</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={pass1}
            onChange={(e) => setPass1(e.target.value)}
            placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Repetir contraseña</label>
          <input
            type="password"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={cambiando || !pass1 || !pass2}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary border border-primary hover:bg-primary hover:text-white transition disabled:opacity-60"
        >
          <KeyRound size={15} />
          {cambiando ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  )
}

export default function MiPerfil() {
  const { session, perfil, refreshPerfil, loading: authLoading } = useAuth()

  if (authLoading) return null

  const rol = perfil?.rol ?? 'consultor'
  const info = ROL_INFO[rol] ?? ROL_INFO.consultor
  const Icon = info.Icon

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle size={22} className="text-primary" />
          <h1 className="text-2xl font-bold text-primary">Mi perfil</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Consulta tu rol y actualiza tus datos y contraseña.
        </p>

        {/* Datos de cuenta (solo lectura) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={15} />
              <span>{session?.user?.email ?? '—'}</span>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${info.badge}`}>
              <Icon size={13} />
              {info.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Miembro desde {fmtFecha(perfil?.created_at)}.{' '}
            {rol === 'superadmin'
              ? 'Tu rol de superadmin es permanente: nadie puede cambiarlo ni desactivar tu cuenta.'
              : 'Tu rol solo lo puede cambiar un administrador.'}
          </p>
        </div>

        {/* Editar nombre + celular (espera a que el perfil cargue) */}
        {perfil ? (
          <FormDatosPersonales
            perfil={perfil}
            userId={session.user.id}
            refreshPerfil={refreshPerfil}
          />
        ) : (
          <div className="flex justify-center py-8 mb-5">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Cambiar contraseña */}
        <FormPassword />
      </div>
    </Layout>
  )
}
