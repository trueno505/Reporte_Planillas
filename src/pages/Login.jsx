import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/auth-context'
import toast from 'react-hot-toast'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Vista de recuperación: pide el correo y envía el enlace para restablecer.
  const [recuperando, setRecuperando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  if (loading) return null
  if (session) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) toast.error(error.message)
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    setSubmitting(false)
    if (error) toast.error(error.message)
    else setEnviado(true)
  }

  const volverALogin = () => {
    setRecuperando(false)
    setEnviado(false)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Logo institucional */}
        <div className="text-center mb-6">
          <img
            src="/muni_sheets_icon.png"
            alt="Muni Sheets"
            className="w-20 mx-auto mb-3"
          />
          <h1 className="text-primary font-bold text-xl leading-tight">Municipalidad Provincial de Ica</h1>
          <p className="text-gray-500 text-sm mt-1">Muni Sheets</p>
        </div>

        {!recuperando ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="usuario@mpi.gob.pe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-light transition disabled:opacity-60"
              >
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setRecuperando(true)}
              className="block mx-auto mt-4 text-xs text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </>
        ) : enviado ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700">Revisa tu correo</p>
            <p className="text-xs text-gray-500">
              Si <b>{email.trim()}</b> tiene una cuenta en el sistema, te enviamos un
              enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
            </p>
            <button
              type="button"
              onClick={volverALogin}
              className="text-xs text-primary hover:underline"
            >
              ← Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleRecuperar} className="space-y-4">
              <p className="text-xs text-gray-500">
                Escribe el correo de tu cuenta y te enviaremos un enlace para
                crear una contraseña nueva.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="usuario@mpi.gob.pe"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-light transition disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
            <button
              type="button"
              onClick={volverALogin}
              className="block mx-auto mt-4 text-xs text-gray-500 hover:underline"
            >
              ← Volver a iniciar sesión
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Solo para personal autorizado de la MPI
        </p>
      </div>
    </div>
  )
}
