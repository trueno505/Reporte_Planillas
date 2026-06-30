import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPagina } from '../lib/db'

export const PAGE_SIZE = 50

const ORDEN_INICIAL = { key: 'apellidos_y_nombres', ascending: true }

/**
 * Lista paginada del lado del servidor para una planilla.
 *
 * - Trae solo `pageSize` (50) filas por página con `.range()` y obtiene el
 *   total real con `{ count: 'exact' }` → `pageCount = Math.ceil(total/pageSize)`.
 * - Búsqueda y ordenamiento también server-side (vuelven siempre a la página 1).
 * - Reajusta la página actual si el total se reduce (p. ej. al borrar filas).
 * - `refetch()` recarga la página + el conteo actuales; lo usa Realtime para
 *   refrescar en vivo sin recargar la app.
 *
 * @param {string} tabla
 * @param {{ pageSize?: number, periodo?: string|null }} [opts]
 */
export function usePlanillaPaginada(tabla, { pageSize = PAGE_SIZE, periodo = null } = {}) {
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearchState] = useState('')
  const [sort, setSortState] = useState(ORDEN_INICIAL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // Descarta respuestas obsoletas (Realtime puede disparar varias seguidas).
  const reqRef = useRef(0)

  // `fetch` cierra sobre page/search/sort; su identidad cambia con ellos, de modo
  // que el efecto de abajo recarga automáticamente al cambiar cualquiera.
  const fetch = useCallback(async () => {
    if (!tabla) {
      setFilas([])
      setTotal(0)
      setLoading(false)
      return
    }
    const id = ++reqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPagina(tabla, {
        page,
        pageSize,
        search,
        orderBy: sort.key,
        ascending: sort.ascending,
        periodo,
      })
      if (id !== reqRef.current) return // llegó una respuesta más nueva
      setFilas(res.filas)
      setTotal(res.total)
    } catch (err) {
      if (id !== reqRef.current) return
      setError(err.message)
      setFilas([])
      setTotal(0)
    }
    if (id === reqRef.current) setLoading(false)
  }, [tabla, pageSize, page, search, sort, periodo])

  // Recarga al cambiar de planilla, página, búsqueda, orden o periodo.
  useEffect(() => { fetch() }, [fetch])

  // Al cambiar de planilla, vuelve al estado inicial.
  useEffect(() => {
    setPage(1)
    setSearchState('')
    setSortState(ORDEN_INICIAL)
  }, [tabla])

  // Al cambiar de mes, vuelve a la primera página (conserva búsqueda y orden).
  useEffect(() => { setPage(1) }, [periodo])

  // Si el total cae por debajo de la página actual (borrados), reajusta.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  // Búsqueda y orden siempre reinician a la página 1.
  const setSearch = useCallback((value) => {
    setSearchState(value)
    setPage(1)
  }, [])

  const setSort = useCallback((key) => {
    setSortState((prev) =>
      prev.key === key ? { key, ascending: !prev.ascending } : { key, ascending: true }
    )
    setPage(1)
  }, [])

  return {
    filas,
    total,
    page,
    setPage,
    pageCount,
    pageSize,
    search,
    setSearch,
    sort,
    setSort,
    loading,
    error,
    refetch: fetch,
  }
}
