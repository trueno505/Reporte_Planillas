import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getSeccionesCalculo } from '../config/planillas'
import { formatPeriodo } from './periodo'

const AZUL = [0, 51, 102]   // #003366
const GRIS = [245, 246, 250] // #f5f6fa

/**
 * Genera y descarga la boleta de pago en PDF para un trabajador.
 * @param {Object} planilla - objeto de configuración de la planilla
 * @param {Object} fila - registro del trabajador
 */
export function generarBoletaPdf(planilla, fila) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
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

  // ─── Tipo de acto administrativo ─────────────────────────────────────────────
  if (fila.tipo_acto_administrativo) {
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Tipo de acto administrativo: ${fila.tipo_acto_administrativo}`, 14, finalY + 18)
  }

  // ─── Pie ─────────────────────────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Documento generado electrónicamente — Municipalidad Provincial de Ica', 14, 287)

  // ─── Descarga ────────────────────────────────────────────────────────────────
  const nombre = String(fila.apellidos_y_nombres ?? fila.dni ?? 'trabajador').replace(/\s+/g, '_')
  const mes = fila.periodo ? `_${String(fila.periodo).slice(0, 7)}` : ''
  doc.save(`Boleta_${planilla.tabla}_${nombre}${mes}.pdf`)
}

function fmt(v) {
  const n = parseFloat(v)
  if (isNaN(n)) return '0.00'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
