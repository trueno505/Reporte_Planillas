import { calcularTotales } from './calculos'
import { getSeccionesCalculo } from '../config/planillas'

export const ALERTA = {
  LIQUIDO_NEGATIVO: 'liquido_negativo',
  TOTAL_DESCUADRADO: 'total_descuadrado',
  FALTAS_EXCESIVAS: 'faltas_excesivas',
}

const ALERTA_CONFIG = {
  [ALERTA.LIQUIDO_NEGATIVO]: { color: 'red', label: 'Líquido negativo' },
  [ALERTA.TOTAL_DESCUADRADO]: { color: 'amber', label: 'Total descuadrado' },
  [ALERTA.FALTAS_EXCESIVAS]: { color: 'orange', label: 'Faltas excesivas' },
}

export function getAlertaConfig(tipo) {
  return ALERTA_CONFIG[tipo] ?? { color: 'gray', label: tipo }
}

/** Detecta alertas para una sola fila */
export function detectarAlertas(planilla, fila) {
  const alertas = []

  // 1. Líquido negativo
  if ((fila.t_liquido ?? 0) < 0) {
    alertas.push({
      tipo: ALERTA.LIQUIDO_NEGATIVO,
      mensaje: `Líquido negativo: S/ ${Number(fila.t_liquido).toFixed(2)}`,
    })
  }

  // 2. Total descuadrado (diferencia > S/ 0.05)
  if (getSeccionesCalculo(planilla)) {
    const calc = calcularTotales(planilla, fila)
    const diff = Math.abs((fila.t_liquido ?? 0) - (calc.t_liquido ?? 0))
    if (diff > 0.05) {
      alertas.push({
        tipo: ALERTA.TOTAL_DESCUADRADO,
        mensaje: `Total descuadrado: registrado S/ ${Number(fila.t_liquido).toFixed(2)}, calculado S/ ${calc.t_liquido.toFixed(2)}`,
      })
    }
  }

  // 3. Faltas excesivas (> 10 días)
  const tieneFaltas = planilla.columnas.some((c) => c.key === 'faltas')
  if (tieneFaltas && (fila.faltas ?? 0) > 10) {
    alertas.push({
      tipo: ALERTA.FALTAS_EXCESIVAS,
      mensaje: `Faltas excesivas: ${fila.faltas} días`,
    })
  }

  return alertas
}

/** Devuelve un Map: id → alertas[] para todas las filas con al menos una alerta */
export function mapAlertasPlanilla(planilla, filas) {
  const map = new Map()
  for (const fila of filas) {
    const a = detectarAlertas(planilla, fila)
    if (a.length > 0) map.set(fila.id, a)
  }
  return map
}
