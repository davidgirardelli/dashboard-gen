import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
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
      <p style={{ color: val >= 0 ? LIME : ORANGE }}>
        sen({label}°) = <span className="font-semibold">{val >= 0 ? '+' : ''}{val}</span>
      </p>
    </div>
  )
}

interface Props { data: DataPoint[] }

export function SenoAreaChart({ data }: Props) {
  const maxPoint = data.reduce((a, b) => (b.seno > a.seno ? b : a), data[0])
  const minPoint = data.reduce((a, b) => (b.seno < a.seno ? b : a), data[0])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradLime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={LIME} stopOpacity={0.4} />
            <stop offset="95%" stopColor={LIME} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="x_graus"
          tickLine={false} axisLine={false}
          tick={{ fontSize: 12, fill: GRAY }}
          tickFormatter={v => `${v}°`}
          ticks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
        />
        <YAxis
          domain={[-1.1, 1.1]}
          tickLine={false} axisLine={false}
          tick={{ fontSize: 12, fill: GRAY }}
          ticks={[-1, -0.5, 0, 0.5, 1]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRAY, strokeWidth: 1, strokeDasharray: '4 4' }} />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1.5} strokeOpacity={0.5} />
        {maxPoint && <ReferenceLine x={maxPoint.x_graus} stroke={LIME}   strokeDasharray="4 4" strokeOpacity={0.5} strokeWidth={1.5} />}
        {minPoint && <ReferenceLine x={minPoint.x_graus} stroke={ORANGE} strokeDasharray="4 4" strokeOpacity={0.5} strokeWidth={1.5} />}
        <Area
          type="monotone" dataKey="seno"
          stroke={LIME} strokeWidth={2.5}
          fill="url(#gradLime)" dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: LIME }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
