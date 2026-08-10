import { getSeccionesCalculo } from '../config/planillas'

/**
 * Calcula t_ingreso, t_dsctos y t_liquido para una fila a partir
 * de la configuración de secciones de la planilla.
 * Retorna un objeto vacío {} si la planilla no admite auto-cálculo.
 */
export function calcularTotales(planilla, fila) {
  const secciones = getSeccionesCalculo(planilla)
  if (!secciones) return {}

  const suma = (keys) =>
    keys.reduce((acc, k) => acc + (parseFloat(fila[k]) || 0), 0)

  const t_ingreso = round2(suma(secciones.ingresoKeys))
  const t_dsctos = round2(suma(secciones.descuentoKeys))
  const t_liquido = round2(t_ingreso - t_dsctos)

  return { t_ingreso, t_dsctos, t_liquido }
}

/** Recalcula los totales de un array de filas y los fusiona */
export function recalcularFilas(planilla, filas) {
  return filas.map((fila) => ({ ...fila, ...calcularTotales(planilla, fila) }))
}

export function round2(n) {
  return Math.round(n * 100) / 100
}
