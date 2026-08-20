import { supabase } from './supabaseClient'
import { ultimosPeriodos, formatPeriodo } from './periodo'

/**
 * Busca los últimos `nMeses` periodos consecutivos (terminando en `periodoBase`, incluido)
 * de un trabajador en su planilla y descarga el PDF de la boleta: la boleta individual
 * clásica si solo hay un mes con datos, o una boleta comparativa de una sola hoja
 * (conceptos en filas, un mes por columna) si hay más de uno.
 *
 * Ojo: los meses se buscan para ESE trabajador, no para la planilla. Un trabajador
 * dado de alta el mes pasado solo tiene un mes aunque su planilla tenga varios, así
 * que el resultado detalla qué meses entraron y cuáles no, para que quien llama pueda
 * avisar sin ambigüedad.
 *
 * @returns {Promise<{encontrados:number, solicitados:number,
 *                    periodosIncluidos:string[], periodosFaltantes:string[]}>}
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

  // jsPDF (~657 KB) se carga solo aquí, la primera vez que alguien imprime una
  // boleta, en vez de venir en el bundle inicial. Quien nunca imprime, nunca lo
  // descarga. Los llamadores ya muestran un spinner mientras esperan.
  const { generarBoletaPdf, generarBoletaPdfMultiple } = await import('./boletaPdf')

  if (data.length === 1) {
    generarBoletaPdf(planilla, data[0])
  } else {
    generarBoletaPdfMultiple(planilla, data)
  }

  const incluidos = data.map((f) => String(f.periodo).slice(0, 10))
  return {
    encontrados: data.length,
    solicitados: nMeses,
    periodosIncluidos: incluidos,
    periodosFaltantes: periodos.filter((p) => !incluidos.includes(p)),
  }
}

/**
 * Mensaje para el aviso cuando no se encontraron todos los meses pedidos.
 * Devuelve null si se encontraron todos (no hay nada que avisar).
 *
 * Antes el aviso decía solo "Solo se encontraron N de M mes(es)", y era fácil
 * confundir los meses del TRABAJADOR con los meses de la PLANILLA; ahora se
 * nombran unos y otros.
 */
export function mensajeMesesFaltantes({ encontrados, solicitados, periodosIncluidos, periodosFaltantes }) {
  if (encontrados >= solicitados) return null
  const incluidos = periodosIncluidos.map(formatPeriodo).join(', ')
  const faltantes = periodosFaltantes.map(formatPeriodo).join(', ')
  return `Este trabajador solo tiene ${encontrados} de los ${solicitados} meses pedidos. `
    + `La boleta incluye: ${incluidos}. Sin registro en: ${faltantes}.`
}
