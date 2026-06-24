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
  const isEditor = perfil?.rol === 'editor'
  const isConsultor = perfil?.rol === 'consultor'
  // Puede modificar datos de las planillas (CRUD + Excel). Admin y editor; el
  // consultor no. La seguridad real la impone RLS; esto solo controla la UI.
  const puedeEditar = isAdmin || isEditor
  const loading = session === undefined

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider
      value={{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
