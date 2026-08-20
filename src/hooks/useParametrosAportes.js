import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { crearCache } from '../lib/cache'

// Los porcentajes cambian muy de vez en cuando (los edita el superadmin), así
// que se cachean: la primera pantalla que los pida hace la consulta y el resto
// la reutiliza, en lugar de golpear la BD en cada modal. El caché comparte
// además la promesa en vuelo, para que abrir dos modales a la vez no dispare
// dos consultas idénticas.
const cache = crearCache({ nombre: 'parametros_aportes', ttlMs: 10 * 60 * 1000 })
const CLAVE = 'todos'

export function invalidarCacheAportes() {
  cache.invalidar(CLAVE)
}

export async function cargarParametrosAportes() {
  return cache.get(CLAVE, async () => {
    const { data, error } = await supabase
      .from('parametros_aportes')
      .select('sistema, afp, concepto, porcentaje')
    if (error) throw error
    return data ?? []
  })
}

/**
 * Porcentajes de aportes previsionales (ONP / AFP).
 * Solo alimentan la vista previa en vivo del formulario: el cálculo definitivo
 * lo hace el trigger de la base de datos.
 */
export function useParametrosAportes() {
  const [parametros, setParametros] = useState(null)

  useEffect(() => {
    let cancelado = false
    cargarParametrosAportes()
      .then((p) => { if (!cancelado) setParametros(p) })
      // Silencioso a propósito: sin parámetros el formulario simplemente no
      // muestra la previsualización de los aportes; la BD igual los calcula.
      .catch(() => { if (!cancelado) setParametros([]) })
    return () => { cancelado = true }
  }, [])

  return parametros
}
