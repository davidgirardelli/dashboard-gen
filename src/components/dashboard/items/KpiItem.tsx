import { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { FiltersPanel } from '@/components/dashboard/FiltersPanel'
import { applyFilters } from '@/lib/applyFilters'
import type { KpiItem, MetricConfig, MetricAgg, MetricFormat } from '@/types/dashboard'
import type { DataSource, SourceData } from '@/types/source'
import { EMPTY_SOURCE_DATA } from '@/types/source'

type Row = Record<string, number>

// ── Aggregation metadata ────────────────────────────────────────────────────

const AGG_LABELS: Record<MetricAgg, string> = {
  max: 'Máx', min: 'Mín', avg: 'Média', sum: 'Soma', count: 'Qtd',
  std: 'σ (desvio)',
  q01: 'Q 1%', q05: 'Q 5%', q50: 'Mediana', q95: 'Q 95%', q99: 'Q 99%',
  ewma: 'Vol EWMA',
}

// ── Statistical helpers ─────────────────────────────────────────────────────

function quantile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  return lo === hi ? sorted[lo] : sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo)
}

/**
 * EWMA volatility: σ²_t = λ·σ²_{t-1} + (1-λ)·r²_t
 * Uses log returns when values are positive, simple returns otherwise.
 * Initialized from the sample variance of all returns.
 */
function ewmaVol(values: number[], lambda: number): number {
  if (values.length < 2) return 0
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    const p = values[i - 1], c = values[i]
    returns.push(p > 0 && c > 0 ? Math.log(c / p) : p !== 0 ? (c - p) / Math.abs(p) : 0)
  }
  if (!returns.length) return 0
  // Warm-up: sample variance of all returns
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  let v = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
  for (const r of returns) v = lambda * v + (1 - lambda) * r * r
  return Math.sqrt(v)
}

function compute(data: Row[], key: string, agg: MetricAgg, lambda = 0.94): number {
  const vals = data.map(d => d[key]).filter(v => !isNaN(v))
  if (!vals.length) return 0
  switch (agg) {
    case 'max':   return Math.max(...vals)
    case 'min':   return Math.min(...vals)
    case 'avg':   return vals.reduce((a, b) => a + b, 0) / vals.length
    case 'sum':   return vals.reduce((a, b) => a + b, 0)
    case 'count': return vals.length
    case 'std': {
      if (vals.length < 2) return 0
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length
      return Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1))
    }
    case 'q01': return quantile([...vals].sort((a, b) => a - b), 0.01)
    case 'q05': return quantile([...vals].sort((a, b) => a - b), 0.05)
    case 'q50': return quantile([...vals].sort((a, b) => a - b), 0.50)
    case 'q95': return quantile([...vals].sort((a, b) => a - b), 0.95)
    case 'q99': return quantile([...vals].sort((a, b) => a - b), 0.99)
    case 'ewma': return ewmaVol(vals, lambda)
  }
}

function fmtAuto(value: number, agg: MetricAgg): string {
  if (agg === 'count') return value.toString()
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs < 0.0001) return value.toExponential(3)
  if (abs < 0.01)   return value.toPrecision(4)
  if (abs < 1)      return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
  return value.toFixed(4).replace(/\.?0+$/, '')
}

function formatValue(value: number, agg: MetricAgg, format: MetricFormat = 'auto', decimals = 2): string {
  if (agg === 'count') return value.toString()
  switch (format) {
    case 'pct':   return `${(value * 100).toFixed(decimals)}%`
    case 'fixed': return value.toFixed(decimals)
    default:      return fmtAuto(value, agg)
  }
}

const LIME = '#A2D133'

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  item: KpiItem
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onUpdate: (patch: Partial<KpiItem>) => void
  containerHeight: number
}

export function KpiItemView({ item, sources, sourcesData, onUpdate, containerHeight }: Props) {
  const [open, setOpen] = useState(false)

  const sd = sourcesData[item.sourceId] ?? EMPTY_SOURCE_DATA

  const { data, headers } = useMemo(() => {
    const filters = item.filters ?? []
    if (!filters.length || !sd.allData.length) return { data: sd.data, headers: sd.headers }
    return applyFilters(sd.allData, sd.headers, filters)
  }, [sd, item.filters])

  const metrics = item.metrics ?? []

  const addMetric = () =>
    onUpdate({ metrics: [...metrics, { metricKey: '', aggregation: 'max', label: '' }] })

  const updateMetric = (i: number, patch: Partial<MetricConfig>) =>
    onUpdate({ metrics: metrics.map((m, idx) => idx === i ? { ...m, ...patch } : m) })

  const removeMetric = (i: number) =>
    onUpdate({ metrics: metrics.filter((_, idx) => idx !== i) })

  const ewmaRows    = metrics.filter(m => m.aggregation === 'ewma').length
  const controlsH   = open ? 56 + metrics.length * 36 + ewmaRows * 0 + 28 : 0
  const toggleH     = 24
  const displayH    = Math.max(60, containerHeight - toggleH - controlsH - 16)

  const cols      = metrics.length <= 1 ? 1 : metrics.length <= 4 ? 2 : 3
  const fontSize  = metrics.length <= 1 ? '2rem' : metrics.length <= 2 ? '1.6rem'
                  : metrics.length <= 4 ? '1.25rem' : '1rem'

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-left w-fit"
      >
        {open ? 'Ocultar controles' : 'Configurar métricas'}
      </button>

      {/* Controls */}
      {open && (
        <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3 flex-shrink-0">
          {/* Source */}
          <NativeSelect label="Fonte" value={item.sourceId}
            onChange={e => onUpdate({ sourceId: e.target.value })}>
            <option value="">— sem fonte —</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </NativeSelect>

          {/* Metric rows */}
          {metrics.map((m, i) => (
            <div key={i} className="flex items-end gap-2 flex-wrap">
              {/* Column */}
              <NativeSelect
                label={i === 0 ? 'Coluna' : undefined}
                value={m.metricKey}
                onChange={e => updateMetric(i, { metricKey: e.target.value })}
              >
                <option value="">—</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </NativeSelect>

              {/* Aggregation with optgroups */}
              <label className="flex flex-col gap-1">
                {i === 0 && <span className="text-xs text-muted-foreground uppercase tracking-wider">Função</span>}
                <select
                  value={m.aggregation}
                  onChange={e => updateMetric(i, { aggregation: e.target.value as MetricAgg })}
                  className="h-8 rounded-md border border-border bg-card text-foreground text-sm px-2 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  style={{
                    colorScheme: 'dark',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C2CECB' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                  }}
                >
                  <optgroup label="Básico">
                    <option value="max">Máx</option>
                    <option value="min">Mín</option>
                    <option value="avg">Média</option>
                    <option value="sum">Soma</option>
                    <option value="count">Contagem</option>
                  </optgroup>
                  <optgroup label="Dispersão">
                    <option value="std">Desvio padrão (σ)</option>
                    <option value="ewma">Volatilidade EWMA</option>
                  </optgroup>
                  <optgroup label="Quantis">
                    <option value="q01">Q 1%</option>
                    <option value="q05">Q 5%</option>
                    <option value="q50">Mediana (Q 50%)</option>
                    <option value="q95">Q 95%</option>
                    <option value="q99">Q 99%</option>
                  </optgroup>
                </select>
              </label>

              {/* Lambda — only for EWMA */}
              {m.aggregation === 'ewma' && (
                <label className="flex flex-col gap-1">
                  {i === 0 && <span className="text-xs text-muted-foreground uppercase tracking-wider">λ</span>}
                  <input
                    type="number"
                    value={m.ewmaLambda ?? 0.94}
                    onChange={e => updateMetric(i, { ewmaLambda: parseFloat(e.target.value) })}
                    min={0.01} max={0.99} step={0.01}
                    className="h-8 w-16 rounded-md border border-border bg-card text-foreground text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
              )}

              {/* Format */}
              <NativeSelect
                label={i === 0 ? 'Formato' : undefined}
                value={m.format ?? 'auto'}
                onChange={e => updateMetric(i, { format: e.target.value as MetricFormat })}
              >
                <option value="auto">Auto</option>
                <option value="fixed">Fixo</option>
                <option value="pct">Percentagem</option>
              </NativeSelect>

              {/* Decimal places — when format is fixed or pct */}
              {(m.format === 'fixed' || m.format === 'pct') && (
                <label className="flex flex-col gap-1">
                  {i === 0 && <span className="text-xs text-muted-foreground uppercase tracking-wider">Casas</span>}
                  <input
                    type="number"
                    value={m.decimals ?? 2}
                    onChange={e => updateMetric(i, { decimals: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) })}
                    min={0} max={10} step={1}
                    className="h-8 w-14 rounded-md border border-border bg-card text-foreground text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
              )}

              {/* Remove */}
              <button
                onClick={() => removeMetric(i)}
                disabled={metrics.length <= 1}
                className="mb-0.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add */}
          <button
            onClick={addMetric}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            Adicionar métrica
          </button>

          <FiltersPanel
            filters={item.filters ?? []}
            allColumns={sd.allColumns}
            allData={sd.allData}
            onChange={filters => onUpdate({ filters })}
          />
        </div>
      )}

      {/* Values display */}
      {metrics.length > 0 ? (
        <div
          className="grid gap-x-2 gap-y-1 items-center justify-items-center overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, height: displayH }}
        >
          {metrics.map((m, i) => {
            const key   = m.metricKey
            const value = key ? compute(data, key, m.aggregation, m.ewmaLambda ?? 0.94) : null
            const lbl   = m.label || key || '—'
            const aggLbl = m.aggregation === 'ewma'
              ? `EWMA λ=${m.ewmaLambda ?? 0.94}`
              : AGG_LABELS[m.aggregation]
            return (
              <div key={i} className="flex flex-col items-center justify-center w-full">
                <div
                  className="font-bold leading-tight text-center truncate w-full px-1"
                  style={{ color: LIME, fontSize }}
                >
                  {value !== null ? formatValue(value, m.aggregation, m.format, m.decimals ?? 2) : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground text-center truncate w-full px-1 mt-0.5">
                  {aggLbl} · {lbl}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {item.sourceId ? 'Adicione uma métrica acima' : 'Selecione uma fonte e configure métricas'}
        </div>
      )}
    </div>
  )
}
