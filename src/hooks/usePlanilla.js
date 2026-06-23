import { useEffect, useState, useCallback } from 'react'
import { fetchAllRows } from '../lib/db'

export function usePlanilla(tabla) {
  const [filas, setFilas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!tabla) return
    setLoading(true)
    setError(null)
    try {
      // Trae todas las filas en bloques de 1000 (límite de PostgREST)
      const data = await fetchAllRows(tabla, { order: 'apellidos_y_nombres' })
      setFilas(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [tabla])

  useEffect(() => { fetch() }, [fetch])

  // Aplica cambios Realtime al estado local sin hacer un nuevo fetch
  const applyChange = useCallback((payload) => {
    setFilas((prev) => {
      switch (payload.eventType) {
        case 'INSERT':
          // Idempotente: no duplicar si la fila ya está (p.ej. tras un refetch)
          return prev.some((r) => r.id === payload.new.id) ? prev : [...prev, payload.new]
        case 'UPDATE':
          return prev.map((r) => (r.id === payload.new.id ? payload.new : r))
        case 'DELETE':
          return prev.filter((r) => r.id !== payload.old.id)
        default:
          return prev
      }
    })
  }, [])

  return { filas, loading, error, refetch: fetch, applyChange }
}
