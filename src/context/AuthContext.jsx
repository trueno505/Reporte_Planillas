import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setPerfil(null)
      return
    }
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [session])

  const isAdmin = perfil?.rol === 'administrador'
  const isConsultor = perfil?.rol === 'consultor'
  const loading = session === undefined

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, perfil, isAdmin, isConsultor, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
