import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import ExcelActualizarColumna from './ExcelActualizarColumna'

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}))

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: ['Hoja1'], Sheets: { Hoja1: {} } })),
  utils: {
    sheet_to_json: vi.fn(),
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
  SSF: { parse_date_code: vi.fn() },
}))

// ─── Fixtures ───────────────────────────────────────────────────────────────
// Planilla con totales automáticos: las columnas de total deben quedar fuera
// del desplegable.
const planilla = {
  tabla: 'cas_general',
  label: 'CAS General',
  columnas: [
    { key: 'dni', label: 'DNI', type: 'dni' },
    { key: 'apellidos_y_nombres', label: 'Apellidos y Nombres', type: 'text' },
    { key: 'r_basica', label: 'R. Básica', type: 'money' },
    { key: 'snp', label: 'SNP', type: 'money' },
    { key: 't_ingreso', label: 'Total Ingreso', type: 'money' },
    { key: 't_dsctos', label: 'Total Descuentos', type: 'money' },
    { key: 't_liquido', label: 'Total Líquido', type: 'money' },
  ],
}

const filas = [
  { dni: 111, apellidos_y_nombres: 'PEREZ JUAN', r_basica: 100 },
  { dni: 222, apellidos_y_nombres: 'GOMEZ ANA', r_basica: 200 },
]

function setup(props = {}) {
  const onDone = vi.fn()
  const onBusy = vi.fn()
  const user = userEvent.setup()
  render(
    <ExcelActualizarColumna
      planilla={planilla}
      filas={filas}
      onDone={onDone}
      onBusy={onBusy}
      {...props}
    />
  )
  const fileInput = document.querySelector('input[type="file"]')
  return { user, onDone, onBusy, fileInput }
}

// Sube un archivo simulando el Excel parseado por XLSX.sheet_to_json.
async function subirExcel(user, fileInput, rows) {
  XLSX.utils.sheet_to_json.mockReturnValue(rows)
  const file = new File(['dummy'], 'datos.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  await user.upload(fileInput, file)
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.rpc.mockResolvedValue({ data: 1, error: null })
})

describe('ExcelActualizarColumna', () => {
  it('abre el modal y oculta las columnas de total en el desplegable', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Actualizar columna/i }))

    const select = screen.getByRole('combobox')
    const opciones = Array.from(select.options).map((o) => o.textContent)

    expect(opciones).toContain('R. Básica')
    expect(opciones).toContain('SNP')
    // Totales automáticos excluidos:
    expect(opciones).not.toContain('Total Ingreso')
    expect(opciones).not.toContain('Total Líquido')
    // DNI nunca es editable:
    expect(opciones).not.toContain('DNI')
  })

  it('muestra la vista previa: actualiza DNIs existentes e ignora los no encontrados', async () => {
    const { user, fileInput } = setup()
    await user.click(screen.getByRole('button', { name: /Actualizar columna/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'r_basica')

    await subirExcel(user, fileInput, [
      { DNI: 111, 'R. Básica': 500 }, // existe → se actualiza
      { DNI: 999, 'R. Básica': 999 }, // no existe → ignorado
    ])

    // Registro que sí se actualiza
    expect(await screen.findByText('PEREZ JUAN')).toBeInTheDocument()
    // El DNI no encontrado se reporta
    expect(screen.getByText(/no existe en esta planilla/i)).toHaveTextContent('999')
    // Botón confirmar refleja 1 registro
    expect(screen.getByRole('button', { name: /Confirmar \(1\)/i })).toBeInTheDocument()
  })

  it('al confirmar llama al RPC con la columna y solo los valores válidos', async () => {
    const { user, fileInput, onDone, onBusy } = setup()
    await user.click(screen.getByRole('button', { name: /Actualizar columna/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'r_basica')

    await subirExcel(user, fileInput, [
      { DNI: 111, 'R. Básica': 500 },
      { DNI: 222, 'R. Básica': 250.5 },
      { DNI: 999, 'R. Básica': 1 }, // no existe → no se envía
    ])

    await screen.findByText('PEREZ JUAN')
    await user.click(screen.getByRole('button', { name: /Confirmar \(2\)/i }))

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1))
    expect(supabase.rpc).toHaveBeenCalledWith('actualizar_columna_planilla', {
      p_tabla: 'cas_general',
      p_columna: 'r_basica',
      p_valores: [
        { dni: 111, valor: 500 },
        { dni: 222, valor: 250.5 },
      ],
    })
    expect(onBusy).toHaveBeenCalledWith(true)
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('detecta la columna de valor con cabecera genérica «VALOR»', async () => {
    const { user, fileInput } = setup()
    await user.click(screen.getByRole('button', { name: /Actualizar columna/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'snp')

    await subirExcel(user, fileInput, [{ DNI: 222, VALOR: 33.33 }])

    await screen.findByText('GOMEZ ANA')
    await user.click(screen.getByRole('button', { name: /Confirmar \(1\)/i }))

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(supabase.rpc).toHaveBeenCalledWith('actualizar_columna_planilla', {
      p_tabla: 'cas_general',
      p_columna: 'snp',
      p_valores: [{ dni: 222, valor: 33.33 }],
    })
  })

  it('no llama al RPC si ningún DNI del Excel existe en la planilla', async () => {
    const { user, fileInput } = setup()
    await user.click(screen.getByRole('button', { name: /Actualizar columna/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'r_basica')

    await subirExcel(user, fileInput, [{ DNI: 888, 'R. Básica': 10 }])

    // 0 a actualizar → botón confirmar deshabilitado
    const confirmar = await screen.findByRole('button', { name: /Confirmar \(0\)/i })
    expect(confirmar).toBeDisabled()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
