import { useState, useMemo } from 'react'
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { FiltersPanel } from '@/components/dashboard/FiltersPanel'
import { filterRows } from '@/lib/applyFilters'
import { cn } from '@/lib/utils'
import type { TableItem } from '@/types/dashboard'
import type { DataSource, SourceData } from '@/types/source'
import { EMPTY_SOURCE_DATA } from '@/types/source'

function fmtCell(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'number') {
    if (v !== 0 && Math.abs(v) < 0.0001) return v.toExponential(3)
    if (Number.isInteger(v)) return v.toString()
    return v.toFixed(4).replace(/\.?0+$/, '')
  }
  return String(v)
}

function isNumericCol(allData: Record<string, unknown>[], col: string): boolean {
  const sample = allData.find(r => r[col] != null && r[col] !== '')
  if (!sample) return false
  const v = sample[col]
  return typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')
}

interface Props {
  item: TableItem
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onUpdate: (patch: Partial<TableItem>) => void
  containerHeight: number
}

export function TableItemView({ item, sources, sourcesData, onUpdate, containerHeight }: Props) {
  const [open, setOpen] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sd = sourcesData[item.sourceId] ?? EMPTY_SOURCE_DATA

  const filteredRows = useMemo(
    () => filterRows(sd.allData, item.filters ?? []),
    [sd.allData, item.filters]
  )

  const allCols     = sd.allColumns
  const displayCols = item.columns.length > 0 ? item.columns.filter(c => allCols.includes(c)) : allCols

  const numericCols = useMemo(
    () => new Set(allCols.filter(c => isNumericCol(sd.allData, c))),
    [sd.allData, allCols]
  )

  const sorted = useMemo(() => {
    if (!sortKey) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const an = Number(av), bn = Number(bv)
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''))
    })
  }, [filteredRows, sortKey, sortDir])

  const maxRows = item.maxRows ?? 100
  const rows    = sorted.slice(0, maxRows)

  const toggleSort = (col: string) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const tableH = Math.max(100, containerHeight - 32 - 24 - (open ? 220 : 0) - 16)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Source + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <NativeSelect
          value={item.sourceId}
          onChange={e => onUpdate({ sourceId: e.target.value, columns: [] })}
          className="text-xs h-7"
        >
          <option value="">— sem fonte —</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        {sd.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {sd.error && <span className="text-xs text-destructive truncate max-w-[200px]">{sd.error}</span>}
        {!sd.loading && !sd.error && sd.allData.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {filteredRows.length !== sd.allData.length
              ? `${filteredRows.length} / ${sd.allData.length} linhas`
              : `${sd.allData.length} linhas`}
          </span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-left w-fit"
      >
        {open ? 'Ocultar controles' : 'Configurar tabela'}
      </button>

      {/* Controls */}
      {open && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 flex-shrink-0 space-y-3">
          {/* Column visibility pills */}
          {allCols.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Colunas visíveis</span>
                <button
                  onClick={() => onUpdate({ columns: [] })}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Todas
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allCols.map(col => {
                  const active = item.columns.length === 0 || item.columns.includes(col)
                  return (
                    <button
                      key={col}
                      onClick={() => {
                        const current = item.columns.length > 0 ? item.columns : allCols
                        const next = active
                          ? current.filter(c => c !== col)
                          : [...current, col]
                        onUpdate({ columns: next.length === allCols.length ? [] : next })
                      }}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors',
                        active
                          ? 'bg-primary text-[#0D1F22] border-transparent font-semibold'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {col}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Max rows */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider w-20">Max linhas</span>
            <input
              type="number"
              value={item.maxRows ?? 100}
              onChange={e => onUpdate({ maxRows: Math.max(1, parseInt(e.target.value) || 100) })}
              min={1} max={10000} step={50}
              className="h-7 w-20 rounded-md border border-border bg-card text-foreground text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <FiltersPanel
            filters={item.filters ?? []}
            allColumns={allCols}
            allData={sd.allData}
            onChange={filters => onUpdate({ filters })}
          />
        </div>
      )}

      {/* Table */}
      {sd.allData.length > 0 ? (
        <div
          className="overflow-auto rounded-md border border-border text-xs"
          style={{ height: tableH }}
        >
          <table className="w-full caption-bottom">
            <thead className="sticky top-0 bg-card z-10 [&_tr]:border-b">
              <tr className="border-b">
                {displayCols.map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={cn(
                      'h-9 px-3 align-middle font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap',
                      'hover:text-foreground transition-colors',
                      numericCols.has(col) ? 'text-right' : 'text-left'
                    )}
                  >
                    <span className={cn('inline-flex items-center gap-1', numericCols.has(col) && 'flex-row-reverse')}>
                      <span>{col}</span>
                      {sortKey === col
                        ? sortDir === 'asc'
                          ? <ArrowUp className="h-3 w-3 flex-shrink-0" />
                          : <ArrowDown className="h-3 w-3 flex-shrink-0" />
                        : <ArrowUpDown className="h-3 w-3 flex-shrink-0 opacity-25" />
                      }
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {rows.map((row, i) => (
                <tr key={i} className="border-b transition-colors hover:bg-muted/40">
                  {displayCols.map(col => (
                    <td
                      key={col}
                      className={cn(
                        'px-3 py-1.5 align-middle',
                        numericCols.has(col) ? 'text-right tabular-nums font-mono' : 'text-left'
                      )}
                    >
                      {fmtCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > maxRows && (
            <div className="sticky bottom-0 bg-card border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground text-center">
              Mostrando {maxRows} de {sorted.length} linhas · aumente "Max linhas" para ver mais
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center text-muted-foreground text-sm flex-1" style={{ minHeight: 80 }}>
          {item.sourceId ? 'Aguardando dados…' : 'Selecione uma fonte acima'}
        </div>
      )}
    </div>
  )
}
