import { describe, it, expect } from 'vitest'
import { castValor, parseFechaExcel } from './casteo'

describe('parseFechaExcel', () => {
  it('devuelve null si el valor está vacío', () => {
    expect(parseFechaExcel('')).toBeNull()
    expect(parseFechaExcel(null)).toBeNull()
    expect(parseFechaExcel(undefined)).toBeNull()
  })

  it('convierte un serial de Excel', () => {
    // 45000 = 2023-03-15 en el calendario de Excel
    expect(parseFechaExcel(45000)).toBe('2023-03-15')
  })

  it('normaliza ISO con uno o dos dígitos', () => {
    expect(parseFechaExcel('2026-8-1')).toBe('2026-08-01')
    expect(parseFechaExcel('2026-08-01')).toBe('2026-08-01')
  })

  it('convierte el formato peruano dd/mm/yyyy', () => {
    expect(parseFechaExcel('1/8/2026')).toBe('2026-08-01')
    expect(parseFechaExcel('21/12/2001')).toBe('2001-12-21')
    expect(parseFechaExcel('01-08-2026')).toBe('2026-08-01')
  })

  it('acepta un objeto Date', () => {
    expect(parseFechaExcel(new Date(2026, 7, 11))).toBe('2026-08-11')
  })

  it('deja pasar el texto que no reconoce, para que lo rechace la BD', () => {
    expect(parseFechaExcel('no es fecha')).toBe('no es fecha')
  })
})

describe('castValor', () => {
  it('convierte todo valor vacío a null (no a 0 ni a cadena vacía)', () => {
    for (const type of ['dni', 'int', 'money', 'date', 'text']) {
      expect(castValor('', type)).toBeNull()
      expect(castValor(null, type)).toBeNull()
      expect(castValor(undefined, type)).toBeNull()
    }
  })

  it('castea enteros y DNI', () => {
    expect(castValor('12345678', 'dni')).toBe(12345678)
    expect(castValor(' 42 ', 'int')).toBe(42)
    expect(castValor('abc', 'int')).toBeNull()
  })

  it('castea importes, aceptando coma decimal', () => {
    expect(castValor('1234.50', 'money')).toBe(1234.5)
    expect(castValor('1234,50', 'money')).toBe(1234.5)
    expect(castValor(' 99 ', 'money')).toBe(99)
    expect(castValor('n/a', 'money')).toBeNull()
  })

  it('preserva el cero (no lo confunde con vacío)', () => {
    expect(castValor(0, 'money')).toBe(0)
    expect(castValor('0', 'money')).toBe(0)
  })

  it('recorta el texto', () => {
    expect(castValor('  PEREZ, Juan  ', 'text')).toBe('PEREZ, Juan')
  })

  it('usa el mismo parseo de fechas en todas las rutas (regresión)', () => {
    // Antes ExcelActualizarColumna no entendía dd/mm/yyyy y ExcelImportarMasivo sí.
    expect(castValor('1/8/2026', 'date')).toBe('2026-08-01')
  })
})
