import { describe, it, expect } from 'vitest'
import { crearNombradorHojas } from './hojaExcel'
import { PLANILLAS } from '../config/planillas'

describe('crearNombradorHojas', () => {
  it('deja intactos los nombres cortos y válidos', () => {
    const nombrar = crearNombradorHojas()
    expect(nombrar('Alcalde')).toBe('Alcalde')
    expect(nombrar('Resumen por áreas')).toBe('Resumen por áreas')
  })

  it('recorta a los 31 caracteres que admite Excel', () => {
    const nombrar = crearNombradorHojas()
    const out = nombrar('Empleados Contrato Plazo Indeterminado')
    expect(out).toBe('Empleados Contrato Plazo Indete')
    expect(out.length).toBe(31)
  })

  it('quita los caracteres que Excel prohíbe', () => {
    const nombrar = crearNombradorHojas()
    expect(nombrar('Ret. Jud. [2026]')).toBe('Ret. Jud. 2026')
    expect(nombrar('CAS / General')).toBe('CAS General')
    expect(nombrar('A:B\\C?D*E')).toBe('A B C D E')
  })

  it('desambigua los duplicados en vez de dejar que Excel falle', () => {
    const nombrar = crearNombradorHojas()
    expect(nombrar('Seg. Rimac')).toBe('Seg. Rimac')
    expect(nombrar('Seg. Rimac')).toBe('Seg. Rimac (2)')
    expect(nombrar('Seg. Rimac')).toBe('Seg. Rimac (3)')
  })

  it('trata los duplicados sin distinguir mayúsculas, como Excel', () => {
    const nombrar = crearNombradorHojas()
    expect(nombrar('Alcalde')).toBe('Alcalde')
    expect(nombrar('ALCALDE')).toBe('ALCALDE (2)')
  })

  it('desambigua cuando el choque SOLO aparece tras recortar (regresión)', () => {
    const nombrar = crearNombradorHojas()
    // Dos etiquetas distintas que comparten los primeros 31 caracteres: es
    // exactamente el caso que rompía la exportación, porque `slice(0, 31)`
    // las convertía en el mismo nombre de hoja y xlsx lanzaba al añadir la
    // segunda. Verificamos primero que el prefijo realmente colisiona.
    const largoA = 'Empleados Contrato Plazo Indeterminado (A)'
    const largoB = 'Empleados Contrato Plazo Indeterminado (B)'
    expect(largoA.slice(0, 31)).toBe(largoB.slice(0, 31))

    const a = nombrar(largoA)
    const b = nombrar(largoB)
    expect(a).toBe('Empleados Contrato Plazo Indete')
    expect(b).toBe('Empleados Contrato Plazo In (2)')
    expect(b.length).toBeLessThanOrEqual(31)
  })

  it('nunca supera los 31 caracteres, ni siquiera al añadir el sufijo', () => {
    const nombrar = crearNombradorHojas()
    for (let i = 0; i < 30; i++) {
      const out = nombrar('Nombre larguísimo de planilla que se corta seguro')
      expect(out.length).toBeLessThanOrEqual(31)
    }
  })

  it('sustituye por un nombre por defecto si la base queda vacía', () => {
    const nombrar = crearNombradorHojas()
    expect(nombrar('')).toBe('Hoja')
    expect(nombrar(null)).toBe('Hoja (2)')
    expect(nombrar('[]')).toBe('Hoja (3)')
  })

  it('las 13 planillas reales + Resumen producen 14 nombres únicos y válidos', () => {
    const nombrar = crearNombradorHojas()
    const nombres = ['Resumen', ...PLANILLAS.map((p) => p.label)].map(nombrar)

    expect(new Set(nombres.map((n) => n.toLowerCase())).size).toBe(nombres.length)
    for (const n of nombres) {
      expect(n.length).toBeGreaterThan(0)
      expect(n.length).toBeLessThanOrEqual(31)
      expect(n).not.toMatch(/[:\\/?*[\]]/)
    }
  })
})
