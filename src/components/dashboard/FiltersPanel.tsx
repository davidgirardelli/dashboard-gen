import { useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import type { DataFilter, FilterOp } from '@/types/dashboard'
import { isNumericField, distinctValues } from '@/lib/applyFilters'

function uid() { return Math.random().toString(36).slice(2, 9) }

const NUM_OPS: { op: FilterOp; label: string }[] = [
  { op: 'gte', label: '>= maior ou igual' },
  { op: 'lte', label: '<= menor ou igual' },
  { op: 'gt',  label: '> maior que' },
  { op: 'lt',  label: '< menor que' },
  { op: 'eq',  label: '= igual' },
  { op: 'neq', label: '≠ diferente' },
  { op: 'in',  label: 'está em (lista)' },
  { op: 'nin', label: 'não está em' },
]

const CAT_OPS: { op: FilterOp; label: string }[] = [
  { op: 'eq',       label: '= igual' },
  { op: 'neq',      label: '≠ diferente' },
  { op: 'contains', label: 'contém' },
  { op: 'in',       label: 'está em (lista)' },
  { op: 'nin',      label: 'não está em' },
]

interface Props {
  filters: DataFilter[]
  allColumns: string[]
  allData: Record<string, unknown>[]
  onChange: (filters: DataFilter[]) => void
}

export function FiltersPanel({ filters, allColumns, allData, onChange }: Props) {
  const colIsNum = useMemo(
    () => Object.fromEntries(allColumns.map(c => [c, isNumericField(allData, c)])),
    [allData, allColumns]
  )

  const distMap = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const f of filters) {
      if ((f.op === 'in' || f.op === 'nin') && f.field && !m[f.field]) {
        m[f.field] = distinctValues(allData, f.field)
      }
    }
    return m
  }, [allData, filters])

  const addFilter = () => {
    const field = allColumns[0] ?? ''
    const isNum = field ? (colIsNum[field] ?? true) : true
    onChange([...filters, { id: uid(), field, op: isNum ? 'gte' : 'eq', value: '' }])
  }

  const update = (id: string, patch: Partial<DataFilter>) =>
    onChange(filters.map(f => f.id === id ? { ...f, ...patch } : f))

  const remove = (id: string) =>
    onChange(filters.filter(f => f.id !== id))

  return (
    <div className="space-y-2 pt-2 border-t border-border/40 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Filtros</span>
        <button
          onClick={addFilter}
          disabled={allColumns.length === 0}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <Plus className="h-3 w-3" />
          Adicionar filtro
        </button>
      </div>

      {filters.length === 0 && (
        <p className="text-[11px] text-muted-foreground/50 italic">Sem filtros — todos os registros serão usados</p>
      )}

      {filters.map(f => {
        const isNum     = f.field ? (colIsNum[f.field] ?? true) : true
        const ops       = isNum ? NUM_OPS : CAT_OPS
        const dists     = distMap[f.field] ?? []
        const showPills = (f.op === 'in' || f.op === 'nin') && dists.length > 0 && dists.length <= 30
        const selected  = new Set(f.value.split(',').map(s => s.trim()).filter(Boolean))

        const togglePill = (val: string) => {
          const next = new Set(selected)
          if (next.has(val)) next.delete(val)
          else next.add(val)
          update(f.id, { value: [...next].join(', ') })
        }

        return (
          <div key={f.id} className="rounded-md border border-border/60 bg-card/50 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <NativeSelect
                value={f.field}
                onChange={e => {
                  const field = e.target.value
                  const num   = colIsNum[field] ?? true
                  update(f.id, { field, op: num ? 'gte' : 'eq', value: '' })
                }}
                className="text-xs h-7 flex-1 min-w-[80px]"
              >
                <option value="">— campo —</option>
                {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>

              <NativeSelect
                value={f.op}
                onChange={e => update(f.id, { op: e.target.value as FilterOp })}
                className="text-xs h-7"
              >
                {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
              </NativeSelect>

              {!showPills && (
                <input
                  type={isNum && !['in', 'nin', 'contains'].includes(f.op) ? 'number' : 'text'}
                  value={f.value}
                  onChange={e => update(f.id, { value: e.target.value })}
                  placeholder={f.op === 'in' || f.op === 'nin' ? 'a, b, c' : 'valor'}
                  className="h-7 flex-1 min-w-[60px] rounded-md border border-border bg-card text-foreground text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  style={{ colorScheme: 'dark' }}
                />
              )}

              <button
                onClick={() => remove(f.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {showPills && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {dists.map(v => (
                  <button
                    key={v}
                    onClick={() => togglePill(v)}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors',
                      selected.has(v)
                        ? 'bg-primary text-[#0D1F22] border-transparent font-semibold'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {filters.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60">
          {filters.length} filtro{filters.length !== 1 ? 's' : ''} ativo{filters.length !== 1 ? 's' : ''} · aplicado apenas neste componente
        </p>
      )}
    </div>
  )
}
