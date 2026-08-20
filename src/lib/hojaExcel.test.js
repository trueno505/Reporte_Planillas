import { describe, it, expect } from 'vitest'
import { crearNombradorHojas } from './hojaExcel'
import { PLANILLAS } from '../config/planillas'
import { construirHojaPlanilla } from './excelEncabezado'

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

// ---------------------------------------------------------------------------
// Las columnas marcadas `excluirExcel` (Fecha de Nacimiento, Tipo de Comisión
// AFP) se editan en la web pero NO deben aparecer en la planilla descargada.
// Se comprueba sobre la hoja realmente generada, no sobre la config.
// ---------------------------------------------------------------------------
describe('construirHojaPlanilla: columnas excluidas del Excel', () => {
  const textoDeLaHoja = (ws) =>
    Object.entries(ws)
      .filter(([k]) => !k.startsWith('!'))
      .map(([, v]) => (typeof v?.v === 'string' ? v.v : ''))
      .join('\u0000')

  const filaDemo = (planilla) => {
    const f = { periodo: '2026-08-01' }
    for (const c of planilla.columnas) {
      if (c.type === 'money') f[c.key] = 10
      else if (c.type === 'int') f[c.key] = 1
      else if (c.type === 'dni') f[c.key] = 12345678
      else if (c.type === 'date') f[c.key] = '1978-05-12'
      else f[c.key] = `V_${c.key}`
    }
    if (planilla.areas?.length) f.area = planilla.areas[0]
    return f
  }

  for (const planilla of PLANILLAS.filter((p) => p.columnas.some((c) => c.excluirExcel))) {
    it(`${planilla.slug}: no imprime sus rótulos ni sus valores`, () => {
      const ws = construirHojaPlanilla(planilla, [filaDemo(planilla)], '2026-08-01', {})
      const texto = textoDeLaHoja(ws)

      for (const col of planilla.columnas.filter((c) => c.excluirExcel)) {
        expect(texto).not.toContain(col.label)
        expect(texto).not.toContain(`V_${col.key}`)
      }
      // Y sigue imprimiendo lo que sí corresponde.
      expect(texto).toContain('Apellidos y Nombres')
    })
  }
})
