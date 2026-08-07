import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getSeccionesCalculo } from '../config/planillas'
import { formatPeriodo } from './periodo'

const AZUL = [0, 51, 102]   // #003366
const GRIS = [245, 246, 250] // #f5f6fa

/**
 * Genera y descarga la boleta de pago en PDF para un trabajador (un solo mes).
 * @param {Object} planilla - objeto de configuración de la planilla
 * @param {Object} fila - registro del trabajador
 */
export function generarBoletaPdf(planilla, fila) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  dibujarPaginaBoleta(doc, planilla, fila)
  doc.save(nombreArchivo(planilla, fila))
}

/**
 * Genera y descarga, en una sola hoja, una boleta comparativa de varios meses
 * (conceptos en filas, un mes por columna). Si recibe un solo mes, cae al
 * layout normal de una boleta individual.
 * @param {Object} planilla - objeto de configuración de la planilla
 * @param {Object[]} filas - registros del trabajador, uno por periodo, en cualquier orden
 */
export function generarBoletaPdfMultiple(planilla, filas) {
  const ordenadas = [...filas].sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  if (ordenadas.length === 1) {
    dibujarPaginaBoleta(doc, planilla, ordenadas[0])
  } else {
    dibujarPaginaComparativa(doc, planilla, ordenadas)
  }

  const primera = ordenadas[0]
  const ultima = ordenadas[ordenadas.length - 1]
  const nombre = String(primera?.apellidos_y_nombres ?? primera?.dni ?? 'trabajador').replace(/\s+/g, '_')
  const rango = `${String(primera?.periodo ?? '').slice(0, 7)}_a_${String(ultima?.periodo ?? '').slice(0, 7)}`
  doc.save(`Boleta_${planilla.tabla}_${nombre}_${rango}.pdf`)
}

function nombreArchivo(planilla, fila) {
  const nombre = String(fila.apellidos_y_nombres ?? fila.dni ?? 'trabajador').replace(/\s+/g, '_')
  const mes = fila.periodo ? `_${String(fila.periodo).slice(0, 7)}` : ''
  return `Boleta_${planilla.tabla}_${nombre}${mes}.pdf`
}

function dibujarPaginaBoleta(doc, planilla, fila) {
  const secciones = getSeccionesCalculo(planilla)
  const colMap = Object.fromEntries(planilla.columnas.map((c) => [c.key, c.label]))

  // ─── Encabezado ─────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('MUNICIPALIDAD PROVINCIAL DE ICA', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('BOLETA DE PAGO DE REMUNERACIONES', 14, 18)
  doc.text(planilla.label.toUpperCase(), 14, 24)
  if (fila.periodo) {
    doc.setFont('helvetica', 'bold')
    doc.text(`MES: ${formatPeriodo(fila.periodo).toUpperCase()}`, 196, 18, { align: 'right' })
    doc.setFont('helvetica', 'normal')
  }

  // ─── Datos del trabajador ────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFillColor(...GRIS)
  doc.rect(0, 30, 210, 22, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Apellidos y Nombres:', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(String(fila.apellidos_y_nombres ?? ''), 62, 38)

  doc.setFont('helvetica', 'bold')
  doc.text('DNI:', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(String(fila.dni ?? ''), 30, 44)

  if (fila.cargo) {
    doc.setFont('helvetica', 'bold')
    doc.text('Cargo:', 80, 44)
    doc.setFont('helvetica', 'normal')
    doc.text(String(fila.cargo), 98, 44)
  }

  if (fila.fecha_ing || fila.f_ingreso) {
    doc.setFont('helvetica', 'bold')
    doc.text('F. Ingreso:', 14, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(String(fila.fecha_ing ?? fila.f_ingreso ?? ''), 42, 50)
  }

  if (fila.snp) {
    doc.setFont('helvetica', 'bold')
    doc.text('S.N.P.:', 80, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(String(fila.snp), 98, 50)
  }

  let cursor = 58

  // ─── Tabla ingresos ─────────────────────────────────────────────────────────
  if (secciones && secciones.ingresoKeys.length > 0) {
    const ingrRows = secciones.ingresoKeys
      .filter((k) => fila[k] != null && parseFloat(fila[k]) !== 0)
      .map((k) => [colMap[k] ?? k, fmt(fila[k])])

    autoTable(doc, {
      startY: cursor,
      head: [['INGRESOS', 'Monto (S/)']],
      body: ingrRows,
      foot: [['TOTAL INGRESOS', fmt(fila.t_ingreso)]],
      headStyles: { fillColor: AZUL, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: AZUL, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right', cellWidth: 35 } },
      margin: { left: 14, right: 110 },
      tableWidth: 86,
      theme: 'striped',
    })

    cursor = doc.lastAutoTable.finalY + 4
  }

  // ─── Tabla descuentos ────────────────────────────────────────────────────────
  if (secciones && secciones.descuentoKeys.length > 0) {
    const dscRows = secciones.descuentoKeys
      .filter((k) => fila[k] != null && parseFloat(fila[k]) !== 0)
      .map((k) => [colMap[k] ?? k, fmt(fila[k])])

    autoTable(doc, {
      startY: 58,
      head: [['DESCUENTOS', 'Monto (S/)']],
      body: dscRows,
      foot: [['TOTAL DESCUENTOS', fmt(fila.t_dsctos)]],
      headStyles: { fillColor: [180, 30, 30], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      footStyles: { fillColor: [180, 30, 30], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'right', cellWidth: 35 } },
      margin: { left: 112, right: 14 },
      tableWidth: 84,
      theme: 'striped',
    })
  }

  // ─── Total líquido ───────────────────────────────────────────────────────────
  const finalY = Math.max(doc.lastAutoTable?.finalY ?? cursor, cursor) + 6
  doc.setFillColor(...AZUL)
  doc.rect(14, finalY, 182, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL LÍQUIDO A PAGAR:', 18, finalY + 8)
  doc.text(`S/ ${fmt(fila.t_liquido)}`, 180, finalY + 8, { align: 'right' })

  let notaY = finalY + 18

  // ─── Conceptos informativos (no suman al líquido: excluirCalculo) ────────────
  const infoKeys = (planilla.excluirCalculo ?? []).filter(
    (k) => fila[k] != null && parseFloat(fila[k]) !== 0
  )
  if (infoKeys.length > 0) {
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    for (const k of infoKeys) {
      doc.text(`${colMap[k] ?? k} (informativo, no suma al total): S/ ${fmt(fila[k])}`, 14, notaY)
      notaY += 5
    }
  }

  // ─── Tipo de acto administrativo ─────────────────────────────────────────────
  if (fila.tipo_acto_administrativo) {
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Tipo de acto administrativo: ${fila.tipo_acto_administrativo}`, 14, notaY)
  }

  // ─── Pie ─────────────────────────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Documento generado electrónicamente — Municipalidad Provincial de Ica', 14, 287)
}

function dibujarPaginaComparativa(doc, planilla, filas) {
  const secciones = getSeccionesCalculo(planilla)
  const colMap = Object.fromEntries(planilla.columnas.map((c) => [c.key, c.label]))
  const nMeses = filas.length
  const ultima = filas[filas.length - 1]

  // ─── Encabezado ─────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('MUNICIPALIDAD PROVINCIAL DE ICA', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('BOLETA DE PAGO DE REMUNERACIONES (COMPARATIVO)', 14, 18)
  doc.text(planilla.label.toUpperCase(), 14, 24)

  const rango = `${formatPeriodo(filas[0].periodo)} — ${formatPeriodo(ultima.periodo)}`
  doc.setFont('helvetica', 'bold')
  doc.text(`MESES: ${rango.toUpperCase()}`, 196, 18, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  // ─── Datos del trabajador (identidad, tomada del mes más reciente) ──────────
  doc.setTextColor(30, 30, 30)
  doc.setFillColor(...GRIS)
  doc.rect(0, 30, 210, 16, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Apellidos y Nombres:', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(String(ultima.apellidos_y_nombres ?? ''), 62, 38)

  doc.setFont('helvetica', 'bold')
  doc.text('DNI:', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(String(ultima.dni ?? ''), 30, 44)

  if (ultima.snp) {
    doc.setFont('helvetica', 'bold')
    doc.text('S.N.P.:', 80, 44)
    doc.setFont('helvetica', 'normal')
    doc.text(String(ultima.snp), 98, 44)
  }

  if (ultima.cargo) {
    doc.setFont('helvetica', 'bold')
    doc.text('Cargo:', 140, 44)
    doc.setFont('helvetica', 'normal')
    doc.text(String(ultima.cargo), 155, 44)
  }

  // ─── Tabla comparativa: conceptos en filas, un mes por columna ──────────────
  const mesesLabels = filas.map((f) => formatPeriodo(f.periodo))
  const valor = (fila, k) => (fila[k] != null ? fmt(fila[k]) : '—')

  const seccionRow = (titulo) => [
    { content: titulo, colSpan: nMeses + 1, styles: { fillColor: [225, 229, 236], textColor: AZUL, fontStyle: 'bold', halign: 'left' } },
  ]

  const conceptoRows = (keys) =>
    keys
      .filter((k) => filas.some((f) => f[k] != null && parseFloat(f[k]) !== 0))
      .map((k) => [colMap[k] ?? k, ...filas.map((f) => valor(f, k))])

  const body = []
  if (secciones && secciones.ingresoKeys.length > 0) {
    body.push(seccionRow('INGRESOS'))
    body.push(...conceptoRows(secciones.ingresoKeys))
    body.push([
      { content: 'TOTAL INGRESOS', styles: { fontStyle: 'bold' } },
      ...filas.map((f) => ({ content: fmt(f.t_ingreso), styles: { fontStyle: 'bold' } })),
    ])
  }
  if (secciones && secciones.descuentoKeys.length > 0) {
    body.push(seccionRow('DESCUENTOS'))
    body.push(...conceptoRows(secciones.descuentoKeys))
    body.push([
      { content: 'TOTAL DESCUENTOS', styles: { fontStyle: 'bold' } },
      ...filas.map((f) => ({ content: fmt(f.t_dsctos), styles: { fontStyle: 'bold' } })),
    ])
  }
  body.push([
    { content: 'TOTAL LÍQUIDO A PAGAR', styles: { fontStyle: 'bold', fillColor: AZUL, textColor: 255 } },
    ...filas.map((f) => ({ content: fmt(f.t_liquido), styles: { fontStyle: 'bold', fillColor: AZUL, textColor: 255 } })),
  ])

  const anchoConcepto = nMeses <= 2 ? 60 : 46
  const anchoMes = (182 - anchoConcepto) / nMeses
  const columnStyles = { 0: { cellWidth: anchoConcepto, fontStyle: 'bold' } }
  for (let i = 1; i <= nMeses; i++) columnStyles[i] = { cellWidth: anchoMes, halign: 'right' }

  // Achicamos letra y espaciado si hay muchos conceptos, para que todo entre en una sola hoja.
  const fontSize = body.length > 32 ? 6 : body.length > 22 ? 6.8 : 7.5
  const cellPadding = body.length > 32 ? 0.8 : 1.2

  autoTable(doc, {
    startY: 50,
    head: [['CONCEPTO', ...mesesLabels.map((m) => m.toUpperCase())]],
    body,
    headStyles: { fillColor: AZUL, textColor: 255, fontSize, fontStyle: 'bold', halign: 'right', cellPadding },
    bodyStyles: { fontSize, cellPadding },
    columnStyles,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === 'head') data.cell.styles.halign = 'left'
    },
  })

  const finalY = doc.lastAutoTable.finalY + 8

  // ─── Tipo de acto administrativo (del mes más reciente) ─────────────────────
  if (ultima.tipo_acto_administrativo) {
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Tipo de acto administrativo (más reciente): ${ultima.tipo_acto_administrativo}`, 14, finalY)
  }

  // ─── Pie ─────────────────────────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Documento generado electrónicamente — Municipalidad Provincial de Ica', 14, 287)
}

function fmt(v) {
  const n = parseFloat(v)
  if (isNaN(n)) return '0.00'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
