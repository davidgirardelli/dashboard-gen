import { useState, useMemo, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { DynamicChart } from '@/components/charts/DynamicChart'
import { ChartControls, type ChartType } from '@/components/dashboard/ChartControls'
import { NativeSelect } from '@/components/ui/native-select'
import { FiltersPanel } from '@/components/dashboard/FiltersPanel'
import { applyFilters } from '@/lib/applyFilters'
import type { ChartItem, ColSpan } from '@/types/dashboard'
import type { DataSource, SourceData } from '@/types/source'
import { EMPTY_SOURCE_DATA } from '@/types/source'

const CONTROLS_HEIGHT = 88
const TOGGLE_HEIGHT   = 24
const MIN_CHART_H     = 80

interface Props {
  item: ChartItem
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onUpdate: (patch: Partial<ChartItem>) => void
  containerHeight: number
  colSpan: ColSpan
}

export function ChartItemView({ item, sources, sourcesData, onUpdate, containerHeight, colSpan }: Props) {
  const [open, setOpen] = useState(false)

  const sd = sourcesData[item.sourceId] ?? EMPTY_SOURCE_DATA

  const { data, headers } = useMemo(() => {
    const filters = item.filters ?? []
    if (!filters.length || !sd.allData.length) return { data: sd.data, headers: sd.headers }
    return applyFilters(sd.allData, sd.headers, filters)
  }, [sd, item.filters])

  // Auto-open controls when data arrives but axes aren't configured yet
  useEffect(() => {
    if (data.length > 0 && (!item.xKey || !item.yKey)) setOpen(true)
  }, [data.length, item.xKey, item.yKey])

  const chartHeight = Math.max(
    MIN_CHART_H,
    containerHeight - TOGGLE_HEIGHT - (open ? CONTROLS_HEIGHT + 12 : 0) - 40
  )

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Source selector — always visible */}
      <div className="flex items-center gap-2 flex-wrap">
        <NativeSelect
          value={item.sourceId}
          onChange={e => onUpdate({ sourceId: e.target.value, xKey: '', yKey: '' })}
          className="text-xs h-7"
        >
          <option value="">— sem fonte —</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        {sd.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {sd.error && <span className="text-xs text-destructive truncate max-w-[180px]">{sd.error}</span>}
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-left w-fit"
      >
        {open ? 'Ocultar controles' : 'Configurar gráfico'}
      </button>

      {open && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 flex-shrink-0 space-y-3">
          <ChartControls
            chartType={item.chartType}
            onChartType={t => onUpdate({ chartType: t as ChartType })}
            headers={headers}
            xKey={item.xKey}
            onXKey={k => onUpdate({ xKey: k })}
            yKey={item.yKey}
            onYKey={k => onUpdate({ yKey: k })}
          />
          <FiltersPanel
            filters={item.filters ?? []}
            allColumns={sd.allColumns}
            allData={sd.allData}
            onChange={filters => onUpdate({ filters })}
          />
        </div>
      )}

      {data.length > 0 && item.xKey && item.yKey
        ? (
          <div key={colSpan} style={{ height: chartHeight, minHeight: MIN_CHART_H }}>
            <DynamicChart
              data={data}
              chartType={item.chartType}
              xKey={item.xKey}
              yKey={item.yKey}
              height={chartHeight}
            />
          </div>
        )
        : (
          <div
            className="flex items-center justify-center text-muted-foreground text-sm"
            style={{ height: chartHeight }}
          >
            {!item.sourceId
              ? 'Selecione uma fonte acima'
              : sd.loading
              ? 'Aguardando dados…'
              : (!item.xKey || !item.yKey)
              ? 'Configure os eixos X e Y acima'
              : 'Sem dados'}
          </div>
        )
      }
    </div>
  )
}
