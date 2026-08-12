import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fmtMoneda } from '../lib/formato'

/**
 * Gráfico de barras del líquido total por grupo (Dashboard).
 *
 * Vive en su propio archivo para poder cargarse con React.lazy: recharts pesa
 * ~344 KB y solo hace falta para este gráfico, así que no tiene por qué
 * retrasar el primer pintado del panel.
 *
 * @param {{ data: Array<{ grupo: string, liquido: number }>, colores: Record<string,string> }} props
 */
export default function GraficoPorGrupo({ data, colores }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="grupo" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`S/ ${fmtMoneda(v)}`, 'Líquido']} />
        <Bar dataKey="liquido" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.grupo} fill={colores[entry.grupo] ?? '#003366'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
