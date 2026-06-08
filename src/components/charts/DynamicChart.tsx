import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar, Cell,
  PieChart, Pie,
  ScatterChart, Scatter, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { useState } from 'react'
import type { ChartType } from '@/components/dashboard/ChartControls'

const LIME   = '#A2D133'
const ORANGE = '#E26D13'
const GRAY   = '#C2CECB'
const WHITE  = '#FFFFFF'


type Row = Record<string, number>

interface TooltipProps { active?: boolean; payload?: { value: number; name: string }[]; label?: string | number }

function BaseTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm space-y-0.5">
      {label !== undefined && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.value >= 0 ? LIME : ORANGE }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}


interface Props {
  data: Row[]
  chartType: ChartType
  xKey: string
  yKey: string
  height?: number
}

export function DynamicChart({ data, chartType, xKey, yKey, height = 300 }: Props) {
  const [activePieIndex, setActivePieIndex] = useState(0)

  const xLabel = (v: number | string) => {
    const n = Number(v)
    return isNaN(n) ? String(v) : Number.isInteger(n) ? `${n}` : n.toFixed(2)
  }

  // Auto-scale Y axis: pad 10% above/below the actual data range
  const yVals = data.map(r => r[yKey]).filter(v => !isNaN(v))
  const yMin  = yVals.length ? Math.min(...yVals) : 0
  const yMax  = yVals.length ? Math.max(...yVals) : 1
  const yRange = yMax - yMin || Math.abs(yMax) * 0.1 || 1
  const yPad   = yRange * 0.1
  const yDomain: [number, number] = [yMin - yPad, yMax + yPad]

  // Format Y ticks with enough precision for small or decimal values
  const yLabel = (v: number) => {
    const abs = Math.abs(v)
    if (abs === 0) return '0'
    if (abs < 0.001) return v.toExponential(1)
    if (abs < 1)    return v.toPrecision(3)
    if (abs < 1000) return Number.isInteger(v) ? `${v}` : v.toFixed(2)
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  }

  // Shared axis/grid props
  const axisStyle = { fontSize: 11, fill: GRAY }
  const gridProps = { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' }

  if (chartType === 'area') return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="dynGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={LIME} stopOpacity={0.4} />
            <stop offset="95%" stopColor={LIME} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={xLabel} />
        <YAxis tickLine={false} axisLine={false} tick={axisStyle} domain={yDomain} tickFormatter={yLabel} />
        <Tooltip content={<BaseTooltip />} cursor={{ stroke: GRAY, strokeWidth: 1, strokeDasharray: '4 4' }} />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1} strokeOpacity={0.4} />
        <Area type="monotone" dataKey={yKey} stroke={LIME} strokeWidth={2.5}
          fill="url(#dynGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: LIME }} />
      </AreaChart>
    </ResponsiveContainer>
  )

  if (chartType === 'line') return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={xLabel} />
        <YAxis tickLine={false} axisLine={false} tick={axisStyle} domain={yDomain} tickFormatter={yLabel} />
        <Tooltip content={<BaseTooltip />} cursor={{ stroke: GRAY, strokeWidth: 1, strokeDasharray: '4 4' }} />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1} strokeOpacity={0.4} />
        <Line type="monotone" dataKey={yKey} stroke={LIME} strokeWidth={2.5}
          dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: LIME }} />
      </LineChart>
    </ResponsiveContainer>
  )

  if (chartType === 'bar') return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={10}>
        <CartesianGrid {...gridProps} vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={xLabel} />
        <YAxis tickLine={false} axisLine={false} tick={axisStyle} domain={yDomain} tickFormatter={yLabel} />
        <Tooltip content={<BaseTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }} />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1} strokeOpacity={0.4} />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]}>
          {data.map((row, i) => (
            <Cell key={i} fill={row[yKey] >= 0 ? LIME : ORANGE} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  if (chartType === 'pie') {
    const step = Math.max(1, Math.floor(data.length / 24))
    const pieData = data
      .filter((_, i) => i % step === 0)
      .map(row => ({
        name: `${xLabel(row[xKey])}`,
        value: Math.abs(row[yKey]),
        original: row[yKey],
      }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={70} outerRadius={110}
            paddingAngle={1}
            onMouseEnter={(_: unknown, index: number) => setActivePieIndex(index)}
          >
            {pieData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.original >= 0 ? LIME : ORANGE}
                fillOpacity={i === activePieIndex ? 1 : 0.7}
                stroke={i === activePieIndex ? WHITE : 'transparent'}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: WHITE }}
          />
          <Legend
            formatter={(value) => <span style={{ color: GRAY, fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'scatter') return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} type="number" name={xKey} tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={xLabel} />
        <YAxis dataKey={yKey} type="number" name={yKey} tickLine={false} axisLine={false} tick={axisStyle} domain={yDomain} tickFormatter={yLabel} />
        <ZAxis range={[30, 30]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: GRAY }}
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: WHITE }}
        />
        <ReferenceLine y={0} stroke={GRAY} strokeWidth={1} strokeOpacity={0.4} />
        <Scatter data={data} fill={LIME} fillOpacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  )

  if (chartType === 'radar') {
    const step = Math.max(1, Math.floor(data.length / 16))
    const radarData = data.filter((_, i) => i % step === 0).map(row => ({
      subject: `${xLabel(row[xKey])}`,
      [yKey]: row[yKey],
    }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius={110} data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: GRAY, fontSize: 11 }} />
          <Radar name={yKey} dataKey={yKey} stroke={LIME} fill={LIME} fillOpacity={0.25} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: 12, color: GRAY }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: WHITE }}
          />
        </RadarChart>
      </ResponsiveContainer>
    )
  }

  return null
}
