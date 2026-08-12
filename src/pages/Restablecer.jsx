import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'
import { PASSWORD_MIN, validarPassword } from '../lib/password'

// Página a la que llega el enlace del correo de recuperación. Supabase valida
// el token del enlace y abre una sesión temporal; aquí el usuario define su
// nueva contraseña. Si el enlace expiró o ya se usó, no habrá sesión y se
// muestra el aviso para solicitar uno nuevo.
export default function Restablecer() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (loading) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errPass = validarPassword(pass1, pass2)
    if (errPass) {
      toast.error(errPass)
      return
    }
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    setGuardando(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Contraseña actualizada. Ya puedes usar el sistema.')
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <img
            src="/muni_sheets_icon.png"
            alt="Muni Sheets"
            className="w-20 mx-auto mb-3"
          />
          <h1 className="text-primary font-bold text-xl leading-tight">Restablecer contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Muni Sheets</p>
        </div>

        {session ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-500">
              Escribe la nueva contraseña para la cuenta <b>{session.user.email}</b>.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Repetir contraseña</label>
              <input
                type="password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Repite la contraseña"
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-light transition disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700">El enlace no es válido o ya expiró</p>
            <p className="text-xs text-gray-500">
              Los enlaces de recuperación solo pueden usarse una vez y caducan
              después de un tiempo. Solicita uno nuevo desde la pantalla de acceso.
            </p>
            <Link to="/login" className="inline-block text-xs text-primary hover:underline">
              ← Volver a iniciar sesión
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Solo para personal autorizado de la MPI
        </p>
      </div>
    </div>
  )
}
