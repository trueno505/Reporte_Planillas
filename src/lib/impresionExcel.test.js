import { describe, it, expect } from 'vitest'
import XLSX from 'xlsx-js-style'
import { aplicarImpresionXml, configurarImpresion, generarLibroImprimible } from './impresionExcel'
import { construirHojaPlanilla } from './excelEncabezado'
import { getPlanillaBySlug } from '../config/planillas'

const MARGENES = '<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
const hojaXml = (antes = '') =>
  `<?xml version="1.0"?><worksheet xmlns="x">${antes}<dimension ref="A1"/><sheetData/>${MARGENES}<ignoredErrors/></worksheet>`

describe('aplicarImpresionXml', () => {
  it('añade ajuste a 1 página de ancho, A4 horizontal y centrado', () => {
    const out = aplicarImpresionXml(hojaXml(), { horizontal: true })
    expect(out).toContain('<worksheet xmlns="x"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension')
    expect(out).toContain(
      `<printOptions horizontalCentered="1"/>${MARGENES}<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><ignoredErrors/>`
    )
  })

  it('respeta la orientación vertical', () => {
    expect(aplicarImpresionXml(hojaXml(), { horizontal: false })).toContain('orientation="portrait"')
  })

  it('reutiliza un <sheetPr> ya existente, abierto o autocerrado', () => {
    const auto = aplicarImpresionXml(hojaXml('<sheetPr codeName="Hoja1"/>'))
    expect(auto).toContain('<sheetPr codeName="Hoja1"><pageSetUpPr fitToPage="1"/></sheetPr>')
    const abierto = aplicarImpresionXml(hojaXml('<sheetPr><outlinePr summaryBelow="0"/></sheetPr>'))
    expect(abierto).toContain('<sheetPr><outlinePr summaryBelow="0"/><pageSetUpPr fitToPage="1"/></sheetPr>')
    expect(abierto.match(/<sheetPr/g)).toHaveLength(1)
  })
})

describe('generarLibroImprimible', () => {
  const leerZip = (bytes) => {
    const zip = XLSX.CFB.read(new Uint8Array(bytes), { type: 'array' })
    return (ruta) => {
      const i = zip.FullPaths.findIndex((p) => p.endsWith(`/${ruta}`))
      return i === -1 ? null : new TextDecoder().decode(zip.FileIndex[i].content)
    }
  }

  it('configura la hoja de planilla y deja intactas las hojas sin marcar', () => {
    const planilla = getPlanillaBySlug('alcalde')
    const fila = { dni: 12345678, apellidos_y_nombres: 'REYES ROQUE, Carlos Humberto', area: planilla.areas?.[0], t_ingreso: 20000 }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, construirHojaPlanilla(planilla, [fila], '2026-08-01', {}), 'Alcalde')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ a: 1 }]), 'Resumen')

    const bytes = generarLibroImprimible(wb)
    const archivo = leerZip(bytes)

    const hoja1 = archivo('xl/worksheets/sheet1.xml')
    expect(hoja1).toContain('<pageSetUpPr fitToPage="1"/>')
    expect(hoja1).toContain('orientation="landscape"')
    expect(archivo('xl/worksheets/sheet2.xml')).not.toContain('<pageSetup')
    // Encabezado institucional (7 filas) + 2 filas de rótulos, repetidos en cada página.
    expect(archivo('xl/workbook.xml')).toContain('name="_xlnm.Print_Titles" localSheetId="0">&apos;Alcalde&apos;!$1:$9<')

    // El libro retocado se sigue leyendo sin problemas.
    const leido = XLSX.read(bytes, { type: 'array' })
    expect(leido.SheetNames).toEqual(['Alcalde', 'Resumen'])
  })

  it('escapa las comillas del nombre de hoja en Print_Titles', () => {
    const wb = XLSX.utils.book_new()
    const ws = configurarImpresion(XLSX.utils.aoa_to_sheet([['x']]), { filasTitulo: 2 })
    XLSX.utils.book_append_sheet(wb, ws, "D'Arcy")
    const archivo = leerZip(generarLibroImprimible(wb))
    expect(archivo('xl/workbook.xml')).toContain('&apos;D&apos;&apos;Arcy&apos;!$1:$2')
  })
})
