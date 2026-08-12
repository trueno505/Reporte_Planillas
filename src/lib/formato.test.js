import { describe, it, expect } from 'vitest'
import { fmtMoneda, fmtFecha, fmtFechaHora } from './formato'
import { PASSWORD_MIN, validarPassword } from './password'

describe('fmtMoneda', () => {
  it('siempre muestra exactamente 2 decimales', () => {
    expect(fmtMoneda(1234.5)).toBe('1,234.50')
    expect(fmtMoneda(1000)).toBe('1,000.00')
    expect(fmtMoneda(0)).toBe('0.00')
  })

  it('recorta a 2 decimales (regresión: antes la tabla mostraba 3)', () => {
    expect(fmtMoneda(1234.567)).toBe('1,234.57')
  })

  it('trata null/undefined como 0', () => {
    expect(fmtMoneda(null)).toBe('0.00')
    expect(fmtMoneda(undefined)).toBe('0.00')
  })

  it('acepta importes como string (PostgREST devuelve NUMERIC así)', () => {
    expect(fmtMoneda('1234.5')).toBe('1,234.50')
  })

  it('formatea negativos', () => {
    expect(fmtMoneda(-50.5)).toBe('-50.50')
  })
})

describe('fmtFecha / fmtFechaHora', () => {
  it('devuelven — cuando no hay valor', () => {
    expect(fmtFecha(null)).toBe('—')
    expect(fmtFecha('')).toBe('—')
    expect(fmtFechaHora(null)).toBe('—')
  })

  it('devuelven — ante una fecha inválida en vez de "Invalid Date"', () => {
    expect(fmtFecha('no es fecha')).toBe('—')
    expect(fmtFechaHora('no es fecha')).toBe('—')
  })

  it('formatean una fecha válida', () => {
    expect(fmtFecha('2026-08-11T12:00:00Z')).toMatch(/2026/)
  })
})

describe('validarPassword', () => {
  it('exige el mínimo de la política, igual que las Edge Functions', () => {
    expect(PASSWORD_MIN).toBe(8)
    expect(validarPassword('a'.repeat(PASSWORD_MIN - 1))).toMatch(/al menos 8/)
    expect(validarPassword('a'.repeat(PASSWORD_MIN))).toBeNull()
  })

  it('rechaza vacío o ausente', () => {
    expect(validarPassword('')).not.toBeNull()
    expect(validarPassword(undefined)).not.toBeNull()
  })

  it('compara la repetición solo cuando se pasa', () => {
    expect(validarPassword('12345678', '12345678')).toBeNull()
    expect(validarPassword('12345678', 'otra1234')).toMatch(/no coinciden/)
    expect(validarPassword('12345678')).toBeNull()
  })
})
