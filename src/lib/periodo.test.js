import { describe, it, expect } from 'vitest'
import {
  formatPeriodo, periodoActual, siguientePeriodo, periodoAnterior,
  ultimosPeriodos, aPrimerDiaMes,
} from './periodo'

describe('formatPeriodo', () => {
  it('formatea el mes en español', () => {
    expect(formatPeriodo('2026-06-01')).toBe('Junio 2026')
    expect(formatPeriodo('2026-01-01')).toBe('Enero 2026')
    expect(formatPeriodo('2026-12-01')).toBe('Diciembre 2026')
  })

  it('tolera valores vacíos', () => {
    expect(formatPeriodo(null)).toBe('—')
    expect(formatPeriodo('')).toBe('—')
  })
})

describe('periodoActual', () => {
  it('devuelve el primer día del mes en curso', () => {
    expect(periodoActual()).toMatch(/^\d{4}-\d{2}-01$/)
  })
})

describe('siguientePeriodo / periodoAnterior', () => {
  it('avanza y retrocede un mes', () => {
    expect(siguientePeriodo('2026-06-01')).toBe('2026-07-01')
    expect(periodoAnterior('2026-07-01')).toBe('2026-06-01')
  })

  it('cruza el cambio de año correctamente', () => {
    expect(siguientePeriodo('2026-12-01')).toBe('2027-01-01')
    expect(periodoAnterior('2026-01-01')).toBe('2025-12-01')
  })

  it('son inversas entre sí en todos los meses del año', () => {
    for (let m = 1; m <= 12; m++) {
      const p = `2026-${String(m).padStart(2, '0')}-01`
      expect(periodoAnterior(siguientePeriodo(p))).toBe(p)
    }
  })
})

describe('ultimosPeriodos', () => {
  it('devuelve n meses consecutivos terminando en el dado, en orden ascendente', () => {
    expect(ultimosPeriodos('2026-03-01', 3)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('cruza el año hacia atrás', () => {
    expect(ultimosPeriodos('2026-01-01', 3)).toEqual(['2025-11-01', '2025-12-01', '2026-01-01'])
  })

  it('con n = 1 devuelve solo el periodo base', () => {
    expect(ultimosPeriodos('2026-06-01', 1)).toEqual(['2026-06-01'])
  })
})

describe('aPrimerDiaMes', () => {
  it('normaliza cualquier fecha al primer día de su mes', () => {
    expect(aPrimerDiaMes('2026-08-23')).toBe('2026-08-01')
    expect(aPrimerDiaMes('2026-08-01')).toBe('2026-08-01')
  })
})
