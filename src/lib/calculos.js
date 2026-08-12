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

/**
 * Redondea a 2 decimales (céntimos), medio hacia arriba en valor absoluto —
 * el mismo criterio que `ROUND(numeric, 2)` de PostgreSQL, que es quien fija
 * los totales definitivos.
 *
 * ÚNICA implementación del proyecto: antes había dos copias (`calculos.js` a
 * secas y `excelEncabezado.js` sumando `Number.EPSILON`), así que un importe
 * podía redondearse distinto en pantalla y en el Excel. Ninguna de las dos era
 * correcta: `x * 100` arrastra el error binario (8.165 * 100 = 816.4999…, que
 * redondea a 8.16) y `Number.EPSILON` solo lo compensa cerca de 1.0.
 *
 * Reparsear el número con notación exponencial (`"8.165e2"`) desplaza la coma
 * sobre la representación DECIMAL, sin introducir ese error.
 */
export function round2(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  const abs = Math.abs(x)
  // Los números muy grandes/pequeños ya se serializan en notación exponencial
  // ("1e-7"), que rompería el truco; ahí basta el redondeo directo.
  const escalado = /e/i.test(String(abs))
    ? Math.round(abs * 100)
    : Math.round(Number(`${abs}e2`))
  return (x < 0 ? -escalado : escalado) / 100
}
