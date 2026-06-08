import { useState, useCallback } from 'react'
import { Database, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultiSourceData } from '@/hooks/useMultiSourceData'
import { SourcesTab } from '@/components/dashboard/SourcesTab'
import { ComponentPalette } from '@/components/dashboard/ComponentPalette'
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas'
import type { DataSource } from '@/types/source'
import type { DashboardItem } from '@/types/dashboard'
import './index.css'

type Tab = 'sources' | 'main'

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'sources', label: 'Fontes',  Icon: Database         },
  { id: 'main',    label: 'Main',    Icon: LayoutDashboard  },
]

export default function App() {
  const [tab,     setTab]     = useState<Tab>('sources')
  const [sources, setSources] = useState<DataSource[]>([])
  const [items,   setItems]   = useState<DashboardItem[]>([])

  const sourcesData = useMultiSourceData(sources)

  const addItem = useCallback((item: DashboardItem) => {
    const withSource = (item.type === 'chart' || item.type === 'kpi')
      ? { ...item, sourceId: sources[0]?.id ?? '' }
      : item
    setItems(prev => [...prev, withSource])
  }, [sources])

  const removeItem  = useCallback((id: string) =>
    setItems(prev => prev.filter(i => i.id !== id)), [])

  const updateItem  = useCallback((id: string, patch: Partial<DashboardItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } as DashboardItem : i)), [])

  const reorderItems = useCallback((next: DashboardItem[]) => setItems(next), [])

  const loadedCount = Object.values(sourcesData).filter(s => s.data.length > 0).length

  return (
    <div className="min-h-screen bg-background">
      {/* App header */}
      <header className="border-b border-border bg-card px-6 py-0 flex items-center gap-8 sticky top-0 z-20">
        <div className="py-3">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Gen-Dash</h1>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {sources.length} fonte{sources.length !== 1 ? 's' : ''}
            {loadedCount > 0 ? ` · ${loadedCount} carregada${loadedCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        {/* Tab bar */}
        <nav className="flex h-full">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 text-sm font-medium border-b-2 transition-colors h-12',
                tab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {id === 'main' && items.length > 0 && (
                <span className="text-[10px] bg-primary text-[#0D1F22] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {tab === 'sources' && (
          <SourcesTab
            sources={sources}
            sourcesData={sourcesData}
            onSources={setSources}
          />
        )}

        {tab === 'main' && (
          <div className="space-y-6">
            {sources.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                Configure fontes na aba{' '}
                <button
                  onClick={() => setTab('sources')}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Fontes
                </button>{' '}
                para alimentar os componentes do dashboard
              </div>
            )}
            <ComponentPalette onAdd={addItem} />
            <DashboardCanvas
              items={items}
              sources={sources}
              sourcesData={sourcesData}
              onRemove={removeItem}
              onUpdate={updateItem}
              onReorder={reorderItems}
            />
          </div>
        )}
      </main>
    </div>
  )
}
