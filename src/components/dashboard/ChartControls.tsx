import {
  AreaChart, BarChart2, LineChart, PieChart,
  ScatterChart, Radar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NativeSelect } from '@/components/ui/native-select'

export type ChartType = 'area' | 'line' | 'bar' | 'pie' | 'scatter' | 'radar'

const CHART_TYPES: { type: ChartType; label: string; Icon: React.ElementType }[] = [
  { type: 'area',    label: 'Área',      Icon: AreaChart    },
  { type: 'line',    label: 'Linha',     Icon: LineChart    },
  { type: 'bar',     label: 'Barra',     Icon: BarChart2    },
  { type: 'pie',     label: 'Pizza',     Icon: PieChart     },
  { type: 'scatter', label: 'Dispersão', Icon: ScatterChart },
  { type: 'radar',   label: 'Radar',     Icon: Radar        },
]

interface Props {
  chartType: ChartType
  onChartType: (t: ChartType) => void
  headers: string[]
  xKey: string
  onXKey: (k: string) => void
  yKey: string
  onYKey: (k: string) => void
}

export function ChartControls({ chartType, onChartType, headers, xKey, onXKey, yKey, onYKey }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <NativeSelect label="Eixo X" value={xKey} onChange={e => onXKey(e.target.value)}>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </NativeSelect>
      <NativeSelect label="Eixo Y" value={yKey} onChange={e => onYKey(e.target.value)}>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </NativeSelect>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</span>
        <div className="flex gap-1 flex-wrap">
          {CHART_TYPES.map(({ type, label, Icon }) => (
            <button
              key={type}
              onClick={() => onChartType(type)}
              title={label}
              className={cn(
                'flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-colors',
                chartType === type
                  ? 'bg-primary text-[#0D1F22]'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
