import type { ChartType } from '@/components/dashboard/ChartControls'

export type ColSpan = number   // 1–12 grid columns

export interface BaseItem {
  id: string
  colSpan: ColSpan
  height: number
  newRow?: boolean              // force item to start on a new grid row
}

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains'

export interface DataFilter {
  id: string
  field: string
  op: FilterOp
  value: string
}

export interface ChartItem extends BaseItem {
  type: 'chart'
  chartType: ChartType
  xKey: string
  yKey: string
  title: string
  sourceId: string
  filters?: DataFilter[]
}

export interface TextBoxItem extends BaseItem {
  type: 'textbox'
  title: string
  content: string
}

export type MetricAgg =
  | 'max' | 'min' | 'avg' | 'sum' | 'count'
  | 'std'
  | 'q01' | 'q05' | 'q50' | 'q95' | 'q99'
  | 'ewma'

export type MetricFormat = 'auto' | 'fixed' | 'pct'

export interface MetricConfig {
  metricKey: string
  aggregation: MetricAgg
  label: string
  ewmaLambda?: number    // only when aggregation === 'ewma', default 0.94
  format?: MetricFormat  // default 'auto'
  decimals?: number      // decimal places for 'fixed' and 'pct', default 2
}

export interface KpiItem extends BaseItem {
  type: 'kpi'
  sourceId: string
  metrics: MetricConfig[]
  filters?: DataFilter[]
}

export interface AlertItem extends BaseItem {
  type: 'alert'
  variant: 'info' | 'warning' | 'success'
  title: string
  message: string
}

export interface SeparatorItem extends BaseItem {
  type: 'separator'
  label: string
}

export interface TableItem extends BaseItem {
  type: 'table'
  sourceId: string
  columns: string[]   // shown columns — empty means all
  maxRows: number
  filters?: DataFilter[]
}

export type DashboardItem = ChartItem | TextBoxItem | KpiItem | AlertItem | SeparatorItem | TableItem
