import type { DashboardItem } from './dashboard'

export interface DashboardView {
  id: string
  name: string
  items: DashboardItem[]   // each view has its own layout; sources are global
  createdAt: number
  updatedAt: number
}
