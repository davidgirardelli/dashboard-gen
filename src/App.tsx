import { useState, useCallback } from 'react'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultiSourceData } from '@/hooks/useMultiSourceData'
import { SourcesTab } from '@/components/dashboard/SourcesTab'
import { ComponentPalette } from '@/components/dashboard/ComponentPalette'
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas'
import { ViewSelector } from '@/components/dashboard/ViewSelector'
import {
  loadViews, saveViews, loadActiveViewId, saveActiveViewId,
  loadSources, saveSources,
} from '@/lib/storage'
import type { DataSource } from '@/types/source'
import type { DashboardItem } from '@/types/dashboard'
import type { DashboardView } from '@/types/view'
import './index.css'

function uid() { return Math.random().toString(36).slice(2, 9) }

function newView(name: string): DashboardView {
  const now = Date.now()
  return { id: uid(), name, items: [], createdAt: now, updatedAt: now }
}

// ── One-time initialisation from localStorage ────────────────────────────────

const _savedViews = loadViews()
const _initViews: DashboardView[] = _savedViews.length > 0 ? _savedViews : (() => {
  const v = [newView('Visão 1')]
  saveViews(v)
  return v
})()
const _savedActiveId = loadActiveViewId()
const _initActiveId  = (_savedActiveId && _initViews.find(v => v.id === _savedActiveId))
  ? _savedActiveId
  : _initViews[0].id
const _initSources = loadSources()

// ── Component ────────────────────────────────────────────────────────────────

const SOURCES_SECTION = '__sources__'

export default function App() {
  // activeSection = SOURCES_SECTION | viewId
  const [activeSection, setActiveSection] = useState<string>(_initActiveId)

  // Global sources — shared by every view
  const [sources, setSources] = useState<DataSource[]>(_initSources)

  // Views — each holds its own item layout
  const [views,        setViews]        = useState<DashboardView[]>(_initViews)
  const [activeViewId, setActiveViewId] = useState<string>(_initActiveId)

  const sourcesData = useMultiSourceData(sources)

  // ── Derived active view ──────────────────────────────────────────────────
  const activeView = views.find(v => v.id === activeViewId) ?? views[0]
  const items: DashboardItem[] = activeView?.items ?? []

  const isOnSources = activeSection === SOURCES_SECTION

  // ── Source mutations ─────────────────────────────────────────────────────

  const handleSetSources = useCallback(
    (update: DataSource[] | ((prev: DataSource[]) => DataSource[])) => {
      setSources(prev => {
        const next = typeof update === 'function' ? update(prev) : update
        saveSources(next)
        return next
      })
    }, []
  )

  // ── Item mutations (scoped to active view) ───────────────────────────────

  const setItems = useCallback(
    (update: DashboardItem[] | ((prev: DashboardItem[]) => DashboardItem[])) => {
      setViews(prev => {
        const curr = prev.find(v => v.id === activeViewId)
        const next = typeof update === 'function' ? update(curr?.items ?? []) : update
        const updated = prev.map(v =>
          v.id === activeViewId ? { ...v, items: next, updatedAt: Date.now() } : v
        )
        saveViews(updated)
        return updated
      })
    }, [activeViewId]
  )

  const addItem     = useCallback((item: DashboardItem) =>
    setItems(prev => [...prev, item]), [setItems])

  const removeItem  = useCallback((id: string) =>
    setItems(prev => prev.filter(i => i.id !== id)), [setItems])

  const updateItem  = useCallback((id: string, patch: Partial<DashboardItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } as DashboardItem : i)), [setItems])

  const reorderItems = useCallback((next: DashboardItem[]) =>
    setItems(next), [setItems])

  // ── View management ──────────────────────────────────────────────────────

  const switchView = useCallback((id: string) => {
    setActiveViewId(id)
    setActiveSection(id)
    saveActiveViewId(id)
  }, [])

  const createView = useCallback(() => {
    setViews(prev => {
      const v = newView(`Visão ${prev.length + 1}`)
      const updated = [...prev, v]
      saveViews(updated)
      setActiveViewId(v.id)
      setActiveSection(v.id)
      saveActiveViewId(v.id)
      return updated
    })
  }, [])

  const renameView = useCallback((id: string, name: string) => {
    setViews(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, name, updatedAt: Date.now() } : v)
      saveViews(updated)
      return updated
    })
  }, [])

  const deleteView = useCallback((id: string) => {
    setViews(prev => {
      if (prev.length <= 1) return prev
      const updated = prev.filter(v => v.id !== id)
      saveViews(updated)
      if (id === activeViewId) {
        const fallback = updated[0].id
        setActiveViewId(fallback)
        setActiveSection(fallback)
        saveActiveViewId(fallback)
      }
      return updated
    })
  }, [activeViewId])

  // ── Render ───────────────────────────────────────────────────────────────

  const loadedCount = Object.values(sourcesData).filter(s => s.data.length > 0).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="px-6 flex items-center gap-4 h-12">
          {/* Brand */}
          <div className="shrink-0 mr-2">
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">Gen-Dash</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              {sources.length} fonte{sources.length !== 1 ? 's' : ''}
              {loadedCount > 0 ? ` · ${loadedCount} carregada${loadedCount !== 1 ? 's' : ''}` : ''}
            </p>
          </div>

          {/* Fontes button — single entry point for source config */}
          <button
            onClick={() =>
              setActiveSection(s => s === SOURCES_SECTION ? activeViewId : SOURCES_SECTION)
            }
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium shrink-0 transition-colors',
              isOnSources
                ? 'bg-primary text-[#0D1F22]'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Database className="h-3.5 w-3.5" />
            Fontes
            {sources.length > 0 && (
              <span className={cn(
                'rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold',
                isOnSources ? 'bg-black/20' : 'bg-primary text-[#0D1F22]'
              )}>
                {sources.length}
              </span>
            )}
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* View tabs */}
          <div className="flex-1 min-w-0">
            <ViewSelector
              views={views}
              activeViewId={isOnSources ? '' : activeViewId}
              onSwitch={switchView}
              onCreate={createView}
              onRename={renameView}
              onDelete={deleteView}
            />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
        {isOnSources ? (
          <SourcesTab
            sources={sources}
            sourcesData={sourcesData}
            onSources={handleSetSources}
          />
        ) : (
          <div className="space-y-6">
            {sources.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                Configure as{' '}
                <button
                  onClick={() => setActiveSection(SOURCES_SECTION)}
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
