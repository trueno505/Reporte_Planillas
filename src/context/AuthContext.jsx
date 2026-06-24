import { useCallback, useEffect, useState } from 'react'
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

  // Carga el perfil del usuario autenticado. Reutilizable para refrescar tras
  // editar el propio perfil (nombre/celular) y que el Header se actualice.
  const cargarPerfil = useCallback(async (userId) => {
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
    return data
  }, [])

  const refreshPerfil = useCallback(() => {
    if (session?.user) return cargarPerfil(session.user.id)
  }, [session, cargarPerfil])

  useEffect(() => {
    if (!session?.user) {
      setPerfil(null)
      return
    }
    cargarPerfil(session.user.id)
  }, [session, cargarPerfil])

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
      value={{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut, refreshPerfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}
