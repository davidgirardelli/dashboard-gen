export interface DataSource {
  id: string
  name: string
  type: 'csv' | 'upload' | 'api' | 'mongo'
  // csv / upload
  csvFile: string
  csvContent?: string
  csvFileName?: string
  // api
  apiUrl: string
  apiPath: string
  // mongo
  mongoUri?: string       // host or full URI without credentials
  mongoUser?: string
  mongoPassword?: string
  mongoDb?: string
  mongoCollection?: string
  mongoFilter?: string    // JSON string, e.g. '{"status":"active"}'
  mongoLimit?: number
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
