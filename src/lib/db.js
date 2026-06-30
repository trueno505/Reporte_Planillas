import { supabase } from './supabaseClient'

// PostgREST (Supabase) limita cada request a 1000 filas por defecto
// (PGRST_DB_MAX_ROWS). Para no perder datos silenciosamente en planillas
// grandes, traemos todas las filas en bloques sucesivos con .range().
const PAGE = 1000

/**
 * Trae TODAS las filas de una tabla, sorteando el límite de 1000 de PostgREST.
 * @param {string} tabla
 * @param {{ order?: string|null }} [opts]
 * @returns {Promise<Array>}
 * @throws si Supabase devuelve un error en cualquier bloque
 */
export async function fetchAllRows(tabla, { order = 'apellidos_y_nombres', periodo = null } = {}) {
  let desde = 0
  let todas = []
  for (;;) {
    let query = supabase.from(tabla).select('*').range(desde, desde + PAGE - 1)
    if (periodo) query = query.eq('periodo', periodo)
    if (order) query = query.order(order, { ascending: true })
    const { data, error } = await query
    if (error) throw error
    todas = todas.concat(data ?? [])
    if (!data || data.length < PAGE) break
    desde += PAGE
  }
  return todas
}

/**
 * Paginación del lado del servidor: trae SOLO las filas de la página pedida
 * con `.range(desde, hasta)` y el conteo real de la planilla con
 * `{ count: 'exact' }`. El total permite calcular `Math.ceil(total / pageSize)`
 * páginas sin descargar toda la tabla.
 *
 * @param {string} tabla
 * @param {{
 *   page?: number,        // 1-based
 *   pageSize?: number,
 *   search?: string,      // filtra por apellidos/nombres (ILIKE) y DNI si es numérico
 *   orderBy?: string,
 *   ascending?: boolean,
 * }} [opts]
 * @returns {Promise<{ filas: Array, total: number }>}
 * @throws si Supabase devuelve un error
 */
export async function fetchPagina(
  tabla,
  { page = 1, pageSize = 50, search = '', orderBy = 'apellidos_y_nombres', ascending = true, periodo = null } = {}
) {
  const desde = (page - 1) * pageSize
  const hasta = desde + pageSize - 1

  let query = supabase.from(tabla).select('*', { count: 'exact' })
  if (periodo) query = query.eq('periodo', periodo)

  const term = String(search ?? '').trim()
  if (term) {
    // Saneamos el término: las comas/paréntesis/asteriscos rompen el filtro
    // `.or()` de PostgREST, así que los convertimos en espacios.
    const safe = term.replace(/[,()*]/g, ' ').trim()
    if (/^\d+$/.test(term)) {
      // Solo dígitos → busca por nombre O por DNI exacto.
      query = query.or(`apellidos_y_nombres.ilike.%${safe}%,dni.eq.${term}`)
    } else {
      query = query.ilike('apellidos_y_nombres', `%${safe}%`)
    }
  }

  const { data, error, count } = await query
    .order(orderBy, { ascending })
    .range(desde, hasta)

  if (error) throw error
  return { filas: data ?? [], total: count ?? 0 }
}
