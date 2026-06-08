import { BarChart2, Type, Hash, Minus, Plus, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DashboardItem } from '@/types/dashboard'

function uid() { return Math.random().toString(36).slice(2, 9) }

const PALETTE: { label: string; icon: React.ElementType; factory: () => DashboardItem }[] = [
  {
    label: 'Gráfico',
    icon: BarChart2,
    factory: () => ({ id: uid(), type: 'chart', colSpan: 12, height: 380, chartType: 'area', xKey: '', yKey: '', title: 'Gráfico', sourceId: '', filters: [] }),
  },
  {
    label: 'Caixa de Texto',
    icon: Type,
    factory: () => ({ id: uid(), type: 'textbox', colSpan: 6, height: 220, title: '', content: '' }),
  },
  {
    label: 'Métrica',
    icon: Hash,
    factory: () => ({
      id: uid(), type: 'kpi', colSpan: 6, height: 200, sourceId: '',
      metrics: [{ metricKey: '', aggregation: 'max', label: '' }], filters: [],
    }),
  },
  {
    label: 'Tabela',
    icon: Table2,
    factory: () => ({
      id: uid(), type: 'table', colSpan: 12, height: 420, sourceId: '',
      columns: [], maxRows: 100, filters: [],
    }),
  },
  {
    label: 'Separador',
    icon: Minus,
    factory: () => ({ id: uid(), type: 'separator', colSpan: 12, height: 24, label: '' }),
  },
]

interface Props { onAdd: (item: DashboardItem) => void }

export function ComponentPalette({ onAdd }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Adicionar</span>
      {PALETTE.map(({ label, icon: Icon, factory }) => (
        <Button key={label} variant="secondary" size="sm" onClick={() => onAdd(factory())}>
          <Plus className="h-3 w-3" />
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}
