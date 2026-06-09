import type { DashboardView } from '@/types/view'
import type { DataSource } from '@/types/source'

const VIEWS_KEY   = 'dash-gen:views'
const ACTIVE_KEY  = 'dash-gen:activeView'
const SOURCES_KEY = 'dash-gen:sources'   // global, shared across all views

export function loadViews(): DashboardView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    return raw ? (JSON.parse(raw) as DashboardView[]) : []
  } catch { return [] }
}

export function saveViews(views: DashboardView[]): void {
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(views)) } catch { /* quota */ }
}

export function loadActiveViewId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveViewId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function loadSources(): DataSource[] {
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    return raw ? (JSON.parse(raw) as DataSource[]) : []
  } catch { return [] }
}

export function saveSources(sources: DataSource[]): void {
  try { localStorage.setItem(SOURCES_KEY, JSON.stringify(sources)) } catch { /* quota */ }
}
