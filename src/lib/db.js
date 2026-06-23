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
export async function fetchAllRows(tabla, { order = 'apellidos_y_nombres' } = {}) {
  let desde = 0
  let todas = []
  for (;;) {
    let query = supabase.from(tabla).select('*').range(desde, desde + PAGE - 1)
    if (order) query = query.order(order, { ascending: true })
    const { data, error } = await query
    if (error) throw error
    todas = todas.concat(data ?? [])
    if (!data || data.length < PAGE) break
    desde += PAGE
  }
  return todas
}
