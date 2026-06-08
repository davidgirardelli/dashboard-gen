import { useRef, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, CornerDownLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChartItemView } from './items/ChartItem'
import { TextBoxItemView } from './items/TextBoxItem'
import { KpiItemView } from './items/KpiItem'
import { AlertItemView } from './items/AlertItem'
import { TableItemView } from './items/TableItem'
import type { DashboardItem, ChartItem, TextBoxItem, KpiItem, AlertItem, SeparatorItem, TableItem, ColSpan } from '@/types/dashboard'
import type { DataSource, SourceData } from '@/types/source'

// Quick-preset column widths shown as buttons in the card header
const QUICK_WIDTHS = [3, 6, 9, 12] as const
const QUICK_LABELS: Record<number, string> = { 3: '¼', 6: '½', 9: '¾', 12: '■' }

const TYPE_LABELS: Record<DashboardItem['type'], string> = {
  chart: 'Gráfico', textbox: 'Texto', kpi: 'Métrica', alert: 'Alerta', separator: 'Separador', table: 'Tabela',
}

// ─── Resize handles ────────────────────────────────────────────────────────

function HeightHandle({ onDelta }: { onDelta: (delta: number) => void }) {
  const lastY = useRef(0)
  return (
    <div
      className="h-2.5 cursor-ns-resize flex items-center justify-center group mt-1 select-none"
      onPointerDown={e => { lastY.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => {
        if (!(e.buttons & 1)) return
        const delta = e.clientY - lastY.current
        lastY.current = e.clientY
        if (Math.abs(delta) > 0) onDelta(delta)
      }}
    >
      <div className="w-8 h-0.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
    </div>
  )
}

function WidthHandle({ colSpan, onColSpan, containerRef }: {
  colSpan: ColSpan
  onColSpan: (c: ColSpan) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const startX = useRef(0)
  const startCol = useRef<ColSpan>(colSpan)
  return (
    <div
      className="absolute right-0 top-8 bottom-8 w-2.5 cursor-ew-resize flex items-center justify-center group select-none z-10"
      onPointerDown={e => {
        startX.current = e.clientX
        startCol.current = colSpan
        e.currentTarget.setPointerCapture(e.pointerId)
        e.stopPropagation()
      }}
      onPointerMove={e => {
        if (!(e.buttons & 1)) return
        const gridW = containerRef.current?.offsetWidth ?? 800
        const colW = gridW / 12
        const rawDelta = e.clientX - startX.current
        const colDelta = rawDelta / colW
        const snapped = Math.round(Math.max(1, Math.min(12, startCol.current + colDelta)))
        if (snapped !== colSpan) onColSpan(snapped)
      }}
    >
      <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors" />
    </div>
  )
}

// ─── Sortable card ──────────────────────────────────────────────────────────

interface SortableCardProps {
  item: DashboardItem
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onRemove: () => void
  onUpdate: (patch: Partial<DashboardItem>) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function SortableCard({ item, sources, sourcesData, onRemove, onUpdate, containerRef }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const newRow = item.type !== 'separator' && !!item.newRow

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  if (item.type === 'separator') {
    const sep = item as SeparatorItem
    return (
      <div ref={setNodeRef} style={{ ...style, gridColumn: 'span 12' }} className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 h-px bg-border" />
        {sep.label && (
          <span className="text-xs text-muted-foreground whitespace-nowrap uppercase tracking-wider">
            {sep.label}
          </span>
        )}
        {sep.label && <div className="flex-1 h-px bg-border" />}
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const contentHeight = Math.max(80, item.height - 64)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        gridColumn: newRow ? `1 / span ${item.colSpan}` : `span ${item.colSpan}`,
      }}
      className="relative min-w-0"
    >
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2 py-2.5 px-3 border-b border-border">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none flex-shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <span className="text-xs font-medium text-muted-foreground flex-1">
            {TYPE_LABELS[item.type]}
            {item.type === 'chart' && (
              <span className="ml-1.5 opacity-60 capitalize">· {(item as ChartItem).chartType}</span>
            )}
          </span>

          {/* Width indicator + quick presets */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-mono text-muted-foreground w-5 text-center select-none">
              {item.colSpan}
            </span>
            {QUICK_WIDTHS.map(step => (
              <button
                key={step}
                onClick={() => onUpdate({ colSpan: step })}
                title={`Largura ${step}/12`}
                className={`text-[10px] w-5 h-5 rounded transition-colors ${
                  item.colSpan === step
                    ? 'bg-primary text-[#0D1F22] font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {QUICK_LABELS[step]}
              </button>
            ))}
          </div>

          {/* New-row toggle */}
          <button
            onClick={() => onUpdate({ newRow: !item.newRow })}
            title={item.newRow ? 'Remover quebra de linha' : 'Forçar nova linha'}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
              item.newRow
                ? 'bg-primary text-[#0D1F22]'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <CornerDownLeft className="h-3 w-3" />
          </button>

          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </CardHeader>

        <CardContent className="px-3 pb-0 pt-3" style={{ height: contentHeight, overflowY: 'auto' }}>
          {item.type === 'chart' && (
            <ChartItemView
              item={item as ChartItem}
              sources={sources}
              sourcesData={sourcesData}
              onUpdate={patch => onUpdate(patch)}
              containerHeight={contentHeight}
              colSpan={item.colSpan as ColSpan}
            />
          )}
          {item.type === 'textbox' && (
            <TextBoxItemView item={item as TextBoxItem} onUpdate={patch => onUpdate(patch)} />
          )}
          {item.type === 'kpi' && (
            <KpiItemView
              item={item as KpiItem}
              sources={sources}
              sourcesData={sourcesData}
              onUpdate={patch => onUpdate(patch)}
              containerHeight={contentHeight}
            />
          )}
          {item.type === 'alert' && (
            <AlertItemView item={item as AlertItem} onUpdate={patch => onUpdate(patch)} />
          )}
          {item.type === 'table' && (
            <TableItemView
              item={item as TableItem}
              sources={sources}
              sourcesData={sourcesData}
              onUpdate={patch => onUpdate(patch)}
              containerHeight={contentHeight}
            />
          )}
        </CardContent>

        <div className="px-3 pb-2">
          <HeightHandle onDelta={delta => onUpdate({ height: Math.max(120, item.height + delta) })} />
        </div>
      </Card>

      <WidthHandle
        colSpan={item.colSpan as ColSpan}
        onColSpan={c => onUpdate({ colSpan: c })}
        containerRef={containerRef}
      />
    </div>
  )
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

interface Props {
  items: DashboardItem[]
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<DashboardItem>) => void
  onReorder: (items: DashboardItem[]) => void
}

export function DashboardCanvas({ items, sources, sourcesData, onRemove, onUpdate, onReorder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onReorder(arrayMove(items, oldIndex, newIndex))
    }
  }, [items, onReorder])

  if (items.length === 0) return (
    <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-muted-foreground text-sm">
      Use a paleta acima para adicionar componentes ao dashboard
    </div>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div ref={containerRef} className="grid grid-cols-12 gap-4 items-start">
          {items.map(item => (
            <SortableCard
              key={item.id}
              item={item}
              sources={sources}
              sourcesData={sourcesData}
              onRemove={() => onRemove(item.id)}
              onUpdate={patch => onUpdate(item.id, patch)}
              containerRef={containerRef}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
