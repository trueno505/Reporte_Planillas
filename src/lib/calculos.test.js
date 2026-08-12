import { describe, it, expect } from 'vitest'
import { calcularTotales, recalcularFilas, round2 } from './calculos'
import { getPlanillaBySlug } from '../config/planillas'

// Planilla real de la config: si cambian sus columnas, estos tests siguen
// siendo válidos porque las claves se leen de la propia configuración.
const planilla = getPlanillaBySlug('empleados-permanentes')

describe('round2', () => {
  it('redondea a céntimos', () => {
    expect(round2(1234.567)).toBe(1234.57)
    expect(round2(1234.564)).toBe(1234.56)
  })

  it('redondea el medio céntimo hacia arriba, como ROUND() de PostgreSQL', () => {
    // En binario 1.005 es 1.00499… y 8.165 es 8.16499…: con `x * 100` ambos
    // caían hacia abajo. Son los casos que motivan el reparseo exponencial.
    expect(round2(1.005)).toBe(1.01)
    expect(round2(8.165)).toBe(8.17)
    expect(round2(2.675)).toBe(2.68)
  })

  it('redondea los negativos en valor absoluto (simétrico)', () => {
    expect(round2(-8.165)).toBe(-8.17)
    expect(round2(-1234.567)).toBe(-1234.57)
  })

  it('deja intactos los valores que ya tienen 2 decimales', () => {
    for (const v of [0, 0.01, 1234.56, -99.99, 1e6]) {
      expect(round2(v)).toBe(v)
    }
  })

  it('tolera null, undefined, strings y no-finitos', () => {
    expect(round2(null)).toBe(0)
    expect(round2(undefined)).toBe(0)
    expect(round2('12.345')).toBe(12.35)
    expect(round2(NaN)).toBe(0)
    expect(round2(Infinity)).toBe(0)
  })
})

describe('calcularTotales', () => {
  it('suma ingresos, descuentos y calcula el líquido', () => {
    const fila = { r_basica: 1000, r_reunif: 500, fdo_pens: 100, p_seg: 50 }
    const { t_ingreso, t_dsctos, t_liquido } = calcularTotales(planilla, fila)
    expect(t_ingreso).toBe(1500)
    expect(t_dsctos).toBe(150)
    expect(t_liquido).toBe(1350)
  })

  it('trata los campos ausentes o no numéricos como 0', () => {
    const { t_ingreso, t_dsctos, t_liquido } = calcularTotales(planilla, {
      r_basica: '1000', r_reunif: null, b_familiar: undefined, b_pers: 'abc',
    })
    expect(t_ingreso).toBe(1000)
    expect(t_dsctos).toBe(0)
    expect(t_liquido).toBe(1000)
  })

  it('acepta importes como string (PostgREST puede devolver NUMERIC así)', () => {
    const { t_ingreso } = calcularTotales(planilla, { r_basica: '1234.50', r_reunif: '0.50' })
    expect(t_ingreso).toBe(1235)
  })

  it('permite un líquido negativo (lo detecta alertas.js, no se recorta aquí)', () => {
    const { t_liquido } = calcularTotales(planilla, { r_basica: 100, fdo_pens: 300 })
    expect(t_liquido).toBe(-200)
  })

  it('NO suma "vacaciones": es texto informativo, no un ingreso', () => {
    const base = calcularTotales(planilla, { r_basica: 1000 })
    const conVacaciones = calcularTotales(planilla, { r_basica: 1000, vacaciones: 'Marzo' })
    expect(conVacaciones.t_ingreso).toBe(base.t_ingreso)
  })

  it('devuelve {} si la planilla no admite auto-cálculo', () => {
    expect(calcularTotales({ sinAutoTotales: true, columnas: [] }, {})).toEqual({})
  })
})

describe('recalcularFilas', () => {
  it('fusiona los totales conservando el resto de campos', () => {
    const filas = [
      { dni: 1, apellidos_y_nombres: 'A', r_basica: 100 },
      { dni: 2, apellidos_y_nombres: 'B', r_basica: 200, fdo_pens: 50 },
    ]
    const out = recalcularFilas(planilla, filas)
    expect(out[0]).toMatchObject({ dni: 1, apellidos_y_nombres: 'A', t_ingreso: 100, t_liquido: 100 })
    expect(out[1]).toMatchObject({ dni: 2, t_ingreso: 200, t_dsctos: 50, t_liquido: 150 })
  })

  it('no muta las filas originales', () => {
    const filas = [{ r_basica: 100 }]
    recalcularFilas(planilla, filas)
    expect(filas[0].t_ingreso).toBeUndefined()
  })
})
