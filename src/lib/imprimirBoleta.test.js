import { describe, it, expect, vi, beforeEach } from 'vitest'

// Rutas de la consulta: se capturan los periodos pedidos y se devuelve lo que
// decida cada test, imitando a un trabajador con menos meses que la planilla.
let filasDevueltas = []
let periodosConsultados = null

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: (_col, vals) => {
            periodosConsultados = vals
            return { order: () => Promise.resolve({ data: filasDevueltas, error: null }) }
          },
        }),
      }),
    }),
  },
}))

const generarBoletaPdf = vi.fn()
const generarBoletaPdfMultiple = vi.fn()
vi.mock('./boletaPdf', () => ({
  generarBoletaPdf: (...a) => generarBoletaPdf(...a),
  generarBoletaPdfMultiple: (...a) => generarBoletaPdfMultiple(...a),
}))

const { imprimirBoletaMeses, mensajeMesesFaltantes } = await import('./imprimirBoleta')
const { getPlanillaByTabla } = await import('../config/planillas')
const planilla = getPlanillaByTabla('empleados_permanentes')

const fila = (periodo) => ({ dni: 11111111, apellidos_y_nombres: 'PEREZ, JUAN', periodo, t_liquido: 100 })

beforeEach(() => {
  generarBoletaPdf.mockClear()
  generarBoletaPdfMultiple.mockClear()
  periodosConsultados = null
})

describe('imprimirBoletaMeses', () => {
  it('consulta los N meses consecutivos que terminan en el periodo base', async () => {
    filasDevueltas = [fila('2026-07-01')]
    await imprimirBoletaMeses(planilla, 11111111, '2026-07-01', 4)
    expect(periodosConsultados).toEqual(['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01'])
  })

  it('con varios meses usa la boleta comparativa', async () => {
    filasDevueltas = [fila('2026-06-01'), fila('2026-07-01')]
    const r = await imprimirBoletaMeses(planilla, 11111111, '2026-07-01', 4)
    expect(generarBoletaPdfMultiple).toHaveBeenCalledTimes(1)
    expect(generarBoletaPdfMultiple.mock.calls[0][1]).toHaveLength(2)
    expect(generarBoletaPdf).not.toHaveBeenCalled()
    expect(r.periodosIncluidos).toEqual(['2026-06-01', '2026-07-01'])
    expect(r.periodosFaltantes).toEqual(['2026-04-01', '2026-05-01'])
  })

  it('un trabajador con un solo mes cae en la boleta individual', async () => {
    filasDevueltas = [fila('2026-07-01')]
    const r = await imprimirBoletaMeses(planilla, 11111111, '2026-07-01', 4)
    expect(generarBoletaPdf).toHaveBeenCalledTimes(1)
    expect(generarBoletaPdfMultiple).not.toHaveBeenCalled()
    expect(r).toMatchObject({ encontrados: 1, solicitados: 4 })
  })

  it('sin datos lanza un error legible', async () => {
    filasDevueltas = []
    await expect(imprimirBoletaMeses(planilla, 11111111, '2026-07-01', 4))
      .rejects.toThrow('No hay datos para generar la boleta.')
  })
})

describe('mensajeMesesFaltantes', () => {
  it('nombra los meses incluidos y los que faltan', () => {
    const msg = mensajeMesesFaltantes({
      encontrados: 1, solicitados: 4,
      periodosIncluidos: ['2026-07-01'],
      periodosFaltantes: ['2026-04-01', '2026-05-01', '2026-06-01'],
    })
    expect(msg).toContain('1 de los 4 meses')
    expect(msg).toContain('Julio 2026')
    expect(msg).toContain('Abril 2026, Mayo 2026, Junio 2026')
  })

  it('no avisa nada cuando están todos', () => {
    expect(mensajeMesesFaltantes({
      encontrados: 2, solicitados: 2,
      periodosIncluidos: ['2026-06-01', '2026-07-01'], periodosFaltantes: [],
    })).toBeNull()
  })
})
