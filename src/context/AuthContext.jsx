import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [perfil, setPerfil] = useState(null)
  // userId cuyo perfil ya terminó de cargar (null = ninguno todavía). Permite
  // mantener loading=true mientras se resuelve el perfil del usuario actual y
  // evita un render intermedio donde puedeEditar sería falso (race en /nuevo-registro).
  const [perfilUserId, setPerfilUserId] = useState(null)

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
      setPerfilUserId(null)
      return
    }
    let cancelado = false
    const uid = session.user.id
    cargarPerfil(uid).finally(() => {
      // Marca el perfil como resuelto para este usuario (haya o no fila).
      if (!cancelado) setPerfilUserId(uid)
    })
    return () => { cancelado = true }
  }, [session, cargarPerfil])

  const isAdmin = perfil?.rol === 'administrador'
  const isEditor = perfil?.rol === 'editor'
  const isConsultor = perfil?.rol === 'consultor'
  // Puede modificar datos de las planillas (CRUD + Excel). Admin y editor; el
  // consultor no. La seguridad real la impone RLS; esto solo controla la UI.
  const puedeEditar = isAdmin || isEditor
  // Cargando mientras no sepamos si hay sesión, o mientras el perfil del usuario
  // actual aún no se haya resuelto (evita redirecciones antes de conocer el rol).
  const loading =
    session === undefined || (!!session?.user && perfilUserId !== session.user.id)

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider
      value={{ session, perfil, isAdmin, isEditor, isConsultor, puedeEditar, loading, signOut, refreshPerfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}
