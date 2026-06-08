import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'

const LIME   = '#A2D133'
const ORANGE = '#E26D13'
const GRAY   = '#C2CECB'

interface DataPoint { x_graus: number; seno: number; [key: string]: number }
interface TooltipProps { active?: boolean; payload?: { value: number }[]; label?: number }

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-foreground mb-1">{label}°</p>
      <p style={{ color: val >= 0 ? LIME : ORANGE }} className="font-semibold">
        {val >= 0 ? '+' : ''}{val}
      </p>
    </div>
  )
}

interface Props { data: DataPoint[] }

export function SenoBarChart({ data }: Props) {
  const sparse = data.filter((_, i) => i % 3 === 0)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sparse} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="x_graus"
          tickLine={false} axisLine={false}
          tick={{ fontSize: 11, fill: GRAY }}
          tickFormatter={v => `${v}°`}
        />
        <YAxis
          domain={[-1.1, 1.1]}
          tickLine={false} axisLine={false}
          tick={{ fontSize: 11, fill: GRAY }}
          ticks={[-1, 0, 1]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }} />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1.5} strokeOpacity={0.5} />
        <Bar dataKey="seno" radius={[3, 3, 0, 0]}>
          {sparse.map((entry, i) => (
            <Cell key={i} fill={entry.seno >= 0 ? LIME : ORANGE} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
