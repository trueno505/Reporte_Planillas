import { round2 } from './redondeo'

// Espejo EXACTO de las funciones SQL afp_canonica / comision_canonica /
// calcular_aportes_pension (ver supabase/migracion_aportes_pension.sql).
// La base de datos es la fuente de verdad: esto solo alimenta la vista previa
// en vivo del formulario. Si tocas una, toca la otra.

/** Columnas que el trigger calcula solo. No se editan a mano. */
export const APORTE_KEYS = ['descuento_snp', 'f_pens', 'p_seg', 'c_var']

/** Columnas que debe tener una planilla para que se le apliquen los aportes. */
const REQUERIDAS = ['afiliacion', 'tipo_comision_afp', ...APORTE_KEYS]

export function planillaTieneAportes(planilla) {
  return REQUERIDAS.every((k) => planilla.columnas.some((c) => c.key === k))
}

/**
 * Reconoce la AFP por palabra clave, no por cadena exacta: los datos reales
 * traen 'AFP Prima' y 'Prima AFP', 'integra' en minúscula, etc.
 */
export function afpCanonica(texto) {
  if (!texto) return null
  const t = String(texto).toLowerCase()
  if (t.includes('integra')) return 'Integra'
  if (t.includes('profuturo')) return 'Profuturo'
  if (t.includes('habitat') || t.includes('hábitat')) return 'Habitat'
  if (t.includes('prima')) return 'Prima'
  return null
}

export function comisionCanonica(texto) {
  if (!texto) return null
  const t = String(texto).toLowerCase()
  if (t.includes('flujo')) return 'flujo'
  if (t.includes('saldo')) return 'saldo'
  return null
}

export function esONP(afiliacion) {
  return String(afiliacion ?? '').trim().toUpperCase() === 'ONP'
}

/** Busca el % en la lista de parámetros. `parametros` = filas de parametros_aportes. */
function pct(parametros, sistema, afp, concepto) {
  const p = parametros?.find(
    (x) => x.sistema === sistema && (x.afp ?? null) === (afp ?? null) && x.concepto === concepto
  )
  return p ? Number(p.porcentaje) : null
}

/**
 * Calcula los aportes previsionales sobre el Total de Ingresos.
 *
 * Devuelve `{ aplica: false }` cuando la afiliación no se reconoce (vacía,
 * 'SI'/'NO' como en CAS General…), igual que el SQL: en ese caso NO se toca
 * ninguno de los cuatro montos.
 */
export function calcularAportes(fila, parametros) {
  const vacio = { aplica: false }
  if (!parametros?.length) return vacio

  const afiliacion = fila?.afiliacion
  if (!afiliacion || !String(afiliacion).trim()) return vacio

  const base = parseFloat(fila?.t_ingreso) || 0

  if (esONP(afiliacion)) {
    const p = pct(parametros, 'ONP', null, 'descuento_snp')
    if (p == null) return vacio
    return {
      aplica: true,
      descuento_snp: round2((base * p) / 100),
      f_pens: 0,
      p_seg: 0,
      c_var: 0,
    }
  }

  const afp = afpCanonica(afiliacion)
  if (!afp) return vacio

  // Sin tipo de comisión registrado se asume FLUJO, igual que el SQL.
  const comision = comisionCanonica(fila?.tipo_comision_afp) ?? 'flujo'
  const monto = (concepto) => {
    const p = pct(parametros, 'AFP', afp, concepto)
    return p == null ? 0 : round2((base * p) / 100)
  }

  return {
    aplica: true,
    descuento_snp: 0,
    f_pens: monto('f_pens'),
    p_seg: monto('p_seg'),
    // Comisión sobre el saldo: no se descuenta de la remuneración.
    c_var: comision === 'flujo' ? monto('c_var') : 0,
  }
}
