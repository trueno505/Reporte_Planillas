import { calcularAportes, planillaTieneAportes } from './aportes'
import { round2 } from './redondeo'
import { getSeccionesCalculo } from '../config/planillas'

/**
 * Calcula t_ingreso, t_dsctos y t_liquido para una fila a partir
 * de la configuración de secciones de la planilla.
 * Retorna un objeto vacío {} si la planilla no admite auto-cálculo.
 */
export function calcularTotales(planilla, fila, parametrosAportes = null) {
  const secciones = getSeccionesCalculo(planilla)
  if (!secciones) return {}

  const suma = (keys, origen) =>
    keys.reduce((acc, k) => acc + (parseFloat(origen[k]) || 0), 0)

  const t_ingreso = round2(suma(secciones.ingresoKeys, fila))

  // Aportes previsionales: se calculan sobre el Total de Ingresos recién
  // obtenido y ANTES de sumar los descuentos, igual que el trigger de la BD
  // (ver migracion_aportes_pension.sql). Si no se pasan los parámetros o la
  // afiliación no se reconoce, la fila queda tal cual.
  const aportes =
    parametrosAportes && planillaTieneAportes(planilla)
      ? calcularAportes({ ...fila, t_ingreso }, parametrosAportes)
      : { aplica: false }

  const conAportes = aportes.aplica
    ? {
        ...fila,
        descuento_snp: aportes.descuento_snp,
        f_pens: aportes.f_pens,
        p_seg: aportes.p_seg,
        c_var: aportes.c_var,
      }
    : fila

  const t_dsctos = round2(suma(secciones.descuentoKeys, conAportes))
  const t_liquido = round2(t_ingreso - t_dsctos)

  const calculados = aportes.aplica
    ? {
        descuento_snp: aportes.descuento_snp,
        f_pens: aportes.f_pens,
        p_seg: aportes.p_seg,
        c_var: aportes.c_var,
      }
    : {}

  return { ...calculados, t_ingreso, t_dsctos, t_liquido }
}

/** Recalcula los totales de un array de filas y los fusiona */
export function recalcularFilas(planilla, filas) {
  return filas.map((fila) => ({ ...fila, ...calcularTotales(planilla, fila) }))
}

// `round2` vive en ./redondeo para que aportes.js pueda usarlo sin crear un
// ciclo de imports (calculos -> aportes -> calculos). Se re-exporta aqui
// porque varios modulos ya lo importaban desde este archivo.
export { round2 }
