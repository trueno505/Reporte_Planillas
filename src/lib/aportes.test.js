import { describe, it, expect } from 'vitest'
import { calcularAportes, afpCanonica, comisionCanonica, planillaTieneAportes } from './aportes'
import { calcularTotales } from './calculos'
import { getPlanillaBySlug } from '../config/planillas'

// Mismos valores que siembra supabase/migracion_aportes_pension.sql.
const PARAMS = [
  { sistema: 'ONP', afp: null, concepto: 'descuento_snp', porcentaje: 13 },
  { sistema: 'AFP', afp: 'Integra', concepto: 'f_pens', porcentaje: 10 },
  { sistema: 'AFP', afp: 'Integra', concepto: 'p_seg', porcentaje: 1.37 },
  { sistema: 'AFP', afp: 'Integra', concepto: 'c_var', porcentaje: 1.55 },
  { sistema: 'AFP', afp: 'Profuturo', concepto: 'f_pens', porcentaje: 10 },
  { sistema: 'AFP', afp: 'Profuturo', concepto: 'p_seg', porcentaje: 1.37 },
  { sistema: 'AFP', afp: 'Profuturo', concepto: 'c_var', porcentaje: 1.69 },
  { sistema: 'AFP', afp: 'Habitat', concepto: 'f_pens', porcentaje: 10 },
  { sistema: 'AFP', afp: 'Habitat', concepto: 'p_seg', porcentaje: 1.37 },
  { sistema: 'AFP', afp: 'Habitat', concepto: 'c_var', porcentaje: 1.47 },
  { sistema: 'AFP', afp: 'Prima', concepto: 'f_pens', porcentaje: 10 },
  { sistema: 'AFP', afp: 'Prima', concepto: 'p_seg', porcentaje: 1.37 },
  { sistema: 'AFP', afp: 'Prima', concepto: 'c_var', porcentaje: 1.6 },
]

describe('afpCanonica', () => {
  it('reconoce las variantes reales de la base', () => {
    expect(afpCanonica('AFP Integra')).toBe('Integra')
    expect(afpCanonica('integra')).toBe('Integra')       // minúscula, dato sucio real
    expect(afpCanonica('AFP Prima')).toBe('Prima')       // como está en la BD
    expect(afpCanonica('Prima AFP')).toBe('Prima')       // como lo ofrece el formulario
    expect(afpCanonica('Profuturo AFP')).toBe('Profuturo')
    expect(afpCanonica('AFP Habitat')).toBe('Habitat')
    expect(afpCanonica('AFP Hábitat')).toBe('Habitat')
  })

  it('no inventa AFP donde no la hay', () => {
    for (const v of ['SI', 'NO', 'ONP', '', null, undefined, 'otra cosa']) {
      expect(afpCanonica(v)).toBeNull()
    }
  })
})

describe('comisionCanonica', () => {
  it('normaliza las dos modalidades', () => {
    expect(comisionCanonica('Comisión sobre el flujo')).toBe('flujo')
    expect(comisionCanonica('Comisión sobre el saldo')).toBe('saldo')
    expect(comisionCanonica('FLUJO')).toBe('flujo')
    expect(comisionCanonica(null)).toBeNull()
  })
})

describe('calcularAportes', () => {
  const base = (extra) => calcularAportes({ t_ingreso: 1000, ...extra }, PARAMS)

  it('ONP: 13 % del total de ingresos en descuento_snp', () => {
    expect(base({ afiliacion: 'ONP' })).toEqual({
      aplica: true, descuento_snp: 130, f_pens: 0, p_seg: 0, c_var: 0,
    })
  })

  it('AFP con comisión sobre el FLUJO: los tres descuentos', () => {
    expect(base({ afiliacion: 'AFP Integra', tipo_comision_afp: 'Comisión sobre el flujo' }))
      .toEqual({ aplica: true, descuento_snp: 0, f_pens: 100, p_seg: 13.7, c_var: 15.5 })
  })

  it('AFP con comisión sobre el SALDO: solo dos, c_var en 0', () => {
    expect(base({ afiliacion: 'AFP Integra', tipo_comision_afp: 'Comisión sobre el saldo' }))
      .toEqual({ aplica: true, descuento_snp: 0, f_pens: 100, p_seg: 13.7, c_var: 0 })
  })

  it('la comisión variable cambia según la AFP', () => {
    const cvar = (afp) =>
      base({ afiliacion: afp, tipo_comision_afp: 'Comisión sobre el flujo' }).c_var
    expect(cvar('AFP Integra')).toBe(15.5)
    expect(cvar('Profuturo AFP')).toBe(16.9)
    expect(cvar('AFP Habitat')).toBe(14.7)
    expect(cvar('AFP Prima')).toBe(16)
  })

  it('sin tipo de comisión asume FLUJO', () => {
    expect(base({ afiliacion: 'AFP Integra' }).c_var).toBe(15.5)
  })

  it('no toca nada si la afiliación no se reconoce', () => {
    for (const v of ['SI', 'NO', '', null, 'cualquier cosa']) {
      expect(base({ afiliacion: v })).toEqual({ aplica: false })
    }
  })

  it('sin parámetros cargados no calcula', () => {
    expect(calcularAportes({ afiliacion: 'ONP', t_ingreso: 1000 }, [])).toEqual({ aplica: false })
  })

  it('redondea a céntimos', () => {
    const r = calcularAportes(
      { afiliacion: 'AFP Integra', tipo_comision_afp: 'Comisión sobre el flujo', t_ingreso: 3256.32 },
      PARAMS
    )
    expect(r.f_pens).toBe(325.63)
    expect(r.p_seg).toBe(44.61)
    expect(r.c_var).toBe(50.47)
  })
})

describe('planillaTieneAportes', () => {
  it('sí en las 12 planillas y no en cesantes', () => {
    expect(planillaTieneAportes(getPlanillaBySlug('empleados-permanentes'))).toBe(true)
    expect(planillaTieneAportes(getPlanillaBySlug('cas-general'))).toBe(true)
    expect(planillaTieneAportes(getPlanillaBySlug('cesantes-pensionistas'))).toBe(false)
  })
})

describe('calcularTotales integra los aportes en t_dsctos', () => {
  const planilla = getPlanillaBySlug('obreros-necesidad-mercado')

  it('ONP: descuento_snp entra en el total de descuentos', () => {
    const t = calcularTotales(planilla, { rem_bas: 1000, afiliacion: 'ONP' }, PARAMS)
    expect(t.t_ingreso).toBe(1000)
    expect(t.descuento_snp).toBe(130)
    expect(t.t_dsctos).toBe(130)
    expect(t.t_liquido).toBe(870)
  })

  it('AFP flujo: suma los tres conceptos', () => {
    const t = calcularTotales(
      planilla,
      { rem_bas: 1000, afiliacion: 'AFP Integra', tipo_comision_afp: 'Comisión sobre el flujo' },
      PARAMS
    )
    expect(t.t_dsctos).toBe(129.2) // 100 + 13.70 + 15.50
    expect(t.t_liquido).toBe(870.8)
  })

  it('AFP saldo: sin comisión variable', () => {
    const t = calcularTotales(
      planilla,
      { rem_bas: 1000, afiliacion: 'AFP Integra', tipo_comision_afp: 'Comisión sobre el saldo' },
      PARAMS
    )
    expect(t.t_dsctos).toBe(113.7)
    expect(t.t_liquido).toBe(886.3)
  })

  it('afiliación inválida: respeta los montos cargados a mano', () => {
    const t = calcularTotales(
      planilla,
      { rem_bas: 1000, afiliacion: 'SI', f_pens: 55, descuento_snp: 0 },
      PARAMS
    )
    expect(t.descuento_snp).toBeUndefined() // no lo calcula
    expect(t.t_dsctos).toBe(55) // conserva el valor manual
  })

  it('sin parámetros se comporta como antes (compatibilidad)', () => {
    const t = calcularTotales(planilla, { rem_bas: 1000, afiliacion: 'ONP', f_pens: 7 })
    expect(t.t_ingreso).toBe(1000)
    expect(t.t_dsctos).toBe(7)
  })
})
