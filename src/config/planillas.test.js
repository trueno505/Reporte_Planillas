import { describe, it, expect } from 'vitest'
import {
  PLANILLAS,
  getSeccionesCalculo,
  rotulosAceptados,
  emparejarEncabezados,
  esColumnaIdentidad,
} from './planillas'

describe('rotulosAceptados', () => {
  it('devuelve el rótulo actual primero', () => {
    expect(rotulosAceptados({ key: 'dni', label: 'DNI' })[0]).toBe('DNI')
  })

  it('incluye el rótulo histórico de afiliacion', () => {
    const r = rotulosAceptados({ key: 'afiliacion', label: 'AFIL. A :' })
    expect(r).toEqual(['AFIL. A :', 'S.N.P.'])
  })

  it('no inventa alias para columnas sin historial', () => {
    expect(rotulosAceptados({ key: 'descuento_snp', label: 'Descuento S.N.P.' })).toEqual([
      'Descuento S.N.P.',
    ])
  })
})

describe('emparejarEncabezados', () => {
  const columnas = [
    { key: 'dni', label: 'DNI' },
    { key: 'apellidos_y_nombres', label: 'Apellidos y Nombres' },
    { key: 'afiliacion', label: 'AFIL. A :' },
    { key: 'descuento_snp', label: 'Descuento S.N.P.' },
  ]

  it('empareja por el rótulo actual', () => {
    const m = emparejarEncabezados(columnas, ['DNI', 'Apellidos y Nombres', 'AFIL. A :'])
    expect(m.get('afiliacion')).toBe('AFIL. A :')
  })

  it('acepta una plantilla vieja con el encabezado "S.N.P."', () => {
    const m = emparejarEncabezados(columnas, ['DNI', 'S.N.P.'])
    expect(m.get('afiliacion')).toBe('S.N.P.')
    expect(m.get('dni')).toBe('DNI')
  })

  it('tolera espacios y mayúsculas', () => {
    const m = emparejarEncabezados(columnas, ['  dni  ', ' s.n.p. '])
    expect(m.get('dni')).toBe('  dni  ')
    expect(m.get('afiliacion')).toBe(' s.n.p. ')
  })

  it('no confunde "Descuento S.N.P." con el alias "S.N.P."', () => {
    const m = emparejarEncabezados(columnas, ['DNI', 'Descuento S.N.P.'])
    expect(m.get('descuento_snp')).toBe('Descuento S.N.P.')
    expect(m.has('afiliacion')).toBe(false)
  })

  it('empareja ambas cuando el Excel viejo trae las dos columnas', () => {
    const m = emparejarEncabezados(columnas, ['DNI', 'S.N.P.', 'Descuento S.N.P.'])
    expect(m.get('afiliacion')).toBe('S.N.P.')
    expect(m.get('descuento_snp')).toBe('Descuento S.N.P.')
  })

  it('el rótulo vigente gana sobre el alias si aparecen los dos', () => {
    const m = emparejarEncabezados(columnas, ['AFIL. A :', 'S.N.P.'])
    expect(m.get('afiliacion')).toBe('AFIL. A :')
  })

  it('no asigna un mismo encabezado a dos columnas', () => {
    const m = emparejarEncabezados(columnas, ['DNI', 'S.N.P.', 'Descuento S.N.P.'])
    const usados = [...m.values()]
    expect(new Set(usados).size).toBe(usados.length)
  })

  it('omite las columnas ausentes en el archivo', () => {
    const m = emparejarEncabezados(columnas, ['DNI'])
    expect(m.has('apellidos_y_nombres')).toBe(false)
  })
})

describe('columna de afiliación en la config', () => {
  it('12 planillas tienen afiliacion y ninguna conserva snp', () => {
    const con = PLANILLAS.filter((p) => p.columnas.some((c) => c.key === 'afiliacion'))
    const viejas = PLANILLAS.filter((p) => p.columnas.some((c) => c.key === 'snp'))
    expect(con).toHaveLength(12)
    expect(viejas).toHaveLength(0)
  })

  it('todas la rotulan "AFIL. A :"', () => {
    for (const p of PLANILLAS) {
      const c = p.columnas.find((c) => c.key === 'afiliacion')
      if (c) expect(c.label).toBe('AFIL. A :')
    }
  })

  it('afiliacion sigue siendo columna de identidad y descuento_snp no', () => {
    expect(esColumnaIdentidad('afiliacion')).toBe(true)
    expect(esColumnaIdentidad('descuento_snp')).toBe(false)
  })
})

describe('columnas Fecha de Nacimiento / Tipo de Comisión AFP', () => {
  const CON = PLANILLAS.filter((p) => p.slug !== 'cesantes-pensionistas')
  const cesantes = PLANILLAS.find((p) => p.slug === 'cesantes-pensionistas')

  it('están en las 12 planillas, menos cesantes', () => {
    expect(CON).toHaveLength(12)
    for (const p of CON) {
      expect(p.columnas.some((c) => c.key === 'fecha_nacimiento')).toBe(true)
      expect(p.columnas.some((c) => c.key === 'tipo_comision_afp')).toBe(true)
    }
    expect(cesantes.columnas.some((c) => c.key === 'fecha_nacimiento')).toBe(false)
    expect(cesantes.columnas.some((c) => c.key === 'tipo_comision_afp')).toBe(false)
  })

  it('van al FINAL, en ese orden', () => {
    for (const p of CON) {
      expect(p.columnas.slice(-2).map((c) => c.key)).toEqual([
        'fecha_nacimiento',
        'tipo_comision_afp',
      ])
    }
  })

  it('están marcadas para NO salir en el Excel de descarga', () => {
    for (const p of CON) {
      for (const key of ['fecha_nacimiento', 'tipo_comision_afp']) {
        expect(p.columnas.find((c) => c.key === key).excluirExcel).toBe(true)
      }
    }
  })

  it('son las ÚNICAS excluidas del Excel', () => {
    for (const p of PLANILLAS) {
      const excluidas = p.columnas.filter((c) => c.excluirExcel).map((c) => c.key)
      expect(excluidas.sort()).toEqual(
        p.slug === 'cesantes-pensionistas' ? [] : ['fecha_nacimiento', 'tipo_comision_afp']
      )
    }
  })

  it('no alteran los totales: ninguna es money ni entra en el cálculo', () => {
    for (const p of CON) {
      const fn = p.columnas.find((c) => c.key === 'fecha_nacimiento')
      const tc = p.columnas.find((c) => c.key === 'tipo_comision_afp')
      expect(fn.type).toBe('date')
      expect(tc.type).toBe('text')
      const s = getSeccionesCalculo(p)
      if (!s) continue
      for (const key of ['fecha_nacimiento', 'tipo_comision_afp']) {
        expect(s.ingresoKeys).not.toContain(key)
        expect(s.descuentoKeys).not.toContain(key)
      }
    }
  })

  it('Tipo de Comisión AFP ofrece flujo y saldo', () => {
    for (const p of CON) {
      expect(p.columnas.find((c) => c.key === 'tipo_comision_afp').opciones).toEqual([
        'Comisión sobre el flujo',
        'Comisión sobre el saldo',
      ])
    }
  })

  it('son opcionales, para no bloquear la edición de registros existentes', () => {
    for (const p of CON) {
      for (const key of ['fecha_nacimiento', 'tipo_comision_afp']) {
        expect(p.columnas.find((c) => c.key === key).opcional).toBe(true)
      }
    }
  })

  it('no son columnas de identidad (se editan mes a mes)', () => {
    expect(esColumnaIdentidad('fecha_nacimiento')).toBe(false)
    expect(esColumnaIdentidad('tipo_comision_afp')).toBe(false)
  })
})
