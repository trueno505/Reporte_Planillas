import { supabase } from './supabaseClient'
import { generarBoletaPdf, generarBoletaPdfMultiple } from './boletaPdf'
import { ultimosPeriodos } from './periodo'

/**
 * Busca los últimos `nMeses` periodos consecutivos (terminando en `periodoBase`, incluido)
 * de un trabajador en su planilla y descarga el PDF de la boleta: una sola página si
 * hay un mes, o un PDF multi-página (uno por mes encontrado) si hay más de uno.
 * Lanza un Error con mensaje amigable si no hay datos.
 */
export async function imprimirBoletaMeses(planilla, dni, periodoBase, nMeses) {
  const periodos = ultimosPeriodos(periodoBase, nMeses)

  const { data, error } = await supabase
    .from(planilla.tabla)
    .select('*')
    .eq('dni', dni)
    .in('periodo', periodos)
    .order('periodo', { ascending: true })

  if (error) throw new Error('No se pudo obtener la boleta del trabajador.')
  if (!data || data.length === 0) throw new Error('No hay datos para generar la boleta.')

  if (data.length === 1) {
    generarBoletaPdf(planilla, data[0])
  } else {
    generarBoletaPdfMultiple(planilla, data)
  }

  return { encontrados: data.length, solicitados: nMeses }
}
