export interface DataSource {
  id: string
  name: string
  type: 'csv' | 'api'
  csvFile: string
  apiUrl: string
  apiPath: string
}

export interface SourceData {
  data: Record<string, number>[]
  headers: string[]
  allData: Record<string, unknown>[]   // all columns (for filtering)
  allColumns: string[]                  // all column names (numeric + categorical)
  loading: boolean
  error: string | null
  resolvedPath: string | null
}

export const EMPTY_SOURCE_DATA: SourceData = {
  data: [], headers: [], allData: [], allColumns: [],
  loading: false, error: null, resolvedPath: null,
}
