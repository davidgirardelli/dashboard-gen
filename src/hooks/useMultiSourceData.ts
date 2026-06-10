import { useState, useEffect, useRef } from 'react'
import { parseCsv, toNumber } from '@/lib/parseCsv'
import type { DataSource, SourceData } from '@/types/source'

type State = Record<string, SourceData>

const LOADING: SourceData = { data: [], headers: [], allData: [], allColumns: [], loading: true,  error: null, resolvedPath: null }
const EMPTY: SourceData   = { data: [], headers: [], allData: [], allColumns: [], loading: false, error: null, resolvedPath: null }

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

type ObjArray = Record<string, unknown>[]

function isObjArray(v: unknown): v is ObjArray {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null
}

/**
 * When no path is given, scan up to two levels of the JSON tree to find
 * the first key whose value is an array of objects.
 */
function autoDetect(json: unknown): { path: string; rows: ObjArray } | null {
  if (isObjArray(json)) return { path: '', rows: json }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null

  const root = json as Record<string, unknown>
  for (const [key, val] of Object.entries(root)) {
    if (isObjArray(val)) return { path: key, rows: val }
  }
  // One level deeper
  for (const [key, val] of Object.entries(root)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k2, v2] of Object.entries(val as Record<string, unknown>)) {
        if (isObjArray(v2)) return { path: `${key}.${k2}`, rows: v2 }
      }
    }
  }
  return null
}

/**
 * Detects the "parallel arrays" pattern used by curve documents:
 *   { du: [1,4,...], dc: [1,6,...], rate: [0.144,...], ref_date: "..." }
 * and converts each document into N scalar rows — one per array index.
 * Scalar fields (strings, numbers) are copied to every expanded row.
 * If the pattern is not present, returns the original rows unchanged.
 */
function unzipParallelArrays(rows: ObjArray): ObjArray {
  const first = rows[0]
  const arrayFields = Object.keys(first).filter(k => Array.isArray(first[k]))
  if (arrayFields.length < 2) return rows

  const len = (first[arrayFields[0]] as unknown[]).length
  const allSameLen = arrayFields.every(k => (first[k] as unknown[]).length === len)
  if (!allSameLen || len === 0) return rows

  const scalarFields = Object.keys(first).filter(k => !Array.isArray(first[k]) && k !== '_id')

  const expanded: ObjArray = []
  for (const doc of rows) {
    for (let i = 0; i < (doc[arrayFields[0]] as unknown[]).length; i++) {
      const row: Record<string, unknown> = {}
      for (const f of scalarFields) row[f] = doc[f]
      for (const f of arrayFields)  row[f] = (doc[f] as unknown[])[i]
      expanded.push(row)
    }
  }
  return expanded
}

function rowsToData(rows: ObjArray): { headers: string[]; data: Record<string, number>[] } | null {
  const headers = Object.keys(rows[0]).filter(k => {
    const v = rows[0][k]
    return typeof v === 'number' || (v !== '' && !isNaN(Number(v)))
  })
  if (!headers.length) return null
  return { headers, data: rows.map(r => Object.fromEntries(headers.map(h => [h, Number(r[h])]))) }
}

async function loadSource(src: DataSource, signal: AbortSignal): Promise<SourceData | null> {
  try {
    if (src.type === 'upload') {
      if (!src.csvContent) return EMPTY
      const rows = parseCsv(src.csvContent)
      if (!rows.length) return { ...EMPTY, error: 'CSV vazio' }
      const allColumns = Object.keys(rows[0])
      const headers    = allColumns.filter(k => rows[0][k] !== '' && !isNaN(parseFloat(rows[0][k])))
      const allData    = rows as unknown as Record<string, unknown>[]
      return { data: toNumber(rows, ...headers), headers, allData, allColumns, loading: false, error: null, resolvedPath: src.csvFileName ?? 'upload' }
    }

    if (src.type === 'mongo') {
      if (!src.mongoUri || !src.mongoDb || !src.mongoCollection) return EMPTY
      let filter: Record<string, unknown> = {}
      if (src.mongoFilter?.trim()) {
        try { filter = JSON.parse(src.mongoFilter) } catch {
          return { ...EMPTY, error: 'Filtro MongoDB inválido — JSON esperado' }
        }
      }
      const res = await fetch('/api/mongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: buildMongoUri(src),
          db: src.mongoDb,
          collection: src.mongoCollection,
          filter,
          limit: src.mongoLimit ?? 1000,
        }),
        signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>
        throw new Error((body.error as string) ?? `HTTP ${res.status}`)
      }
      const raw: unknown = await res.json()
      if (!isObjArray(raw))
        return { ...EMPTY, error: 'Proxy retornou formato inesperado' }
      const rows = unzipParallelArrays(raw)
      const parsed = rowsToData(rows)
      if (!parsed) return { ...EMPTY, error: 'Nenhuma coluna numérica encontrada' }
      const allColumns = Object.keys(rows[0])
      return { ...parsed, allData: rows, allColumns, loading: false, error: null,
        resolvedPath: `${src.mongoDb}.${src.mongoCollection}` }
    }

    if (src.type === 'csv') {
      if (!src.csvFile) return EMPTY
      const res = await fetch(`/${src.csvFile}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const rows = parseCsv(text)
      if (!rows.length) return { ...EMPTY, error: 'CSV vazio' }
      const allColumns = Object.keys(rows[0])
      const headers    = allColumns.filter(k => rows[0][k] !== '' && !isNaN(parseFloat(rows[0][k])))
      const allData    = rows as unknown as Record<string, unknown>[]
      return { data: toNumber(rows, ...headers), headers, allData, allColumns, loading: false, error: null, resolvedPath: src.csvFile }
    } else {
      if (!src.apiUrl) return EMPTY
      const res = await fetch(src.apiUrl, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: unknown = await res.json()

      let rows: ObjArray
      let resolvedPath: string

      if (src.apiPath) {
        // User specified a path — use it directly
        const target = getByPath(json, src.apiPath)
        if (!isObjArray(target))
          return { ...EMPTY, error: `Caminho "${src.apiPath}" não retornou array de objetos` }
        rows = target
        resolvedPath = src.apiPath
      } else {
        // Auto-detect the first array of objects in the response
        const found = autoDetect(json)
        if (!found)
          return { ...EMPTY, error: 'Nenhum array de objetos encontrado na resposta. Especifique um caminho manualmente.' }
        rows = found.rows
        resolvedPath = found.path
      }

      const parsed     = rowsToData(rows)
      if (!parsed) return { ...EMPTY, error: 'Nenhuma coluna numérica encontrada' }
      const allColumns = Object.keys(rows[0])
      return { ...parsed, allData: rows, allColumns, loading: false, error: null, resolvedPath }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null   // caller checks signal.aborted
    return { ...EMPTY, error: String(err) }
  }
}

/** Injects user/password into a MongoDB URI that has no embedded credentials. */
function buildMongoUri(src: DataSource): string {
  let uri = src.mongoUri ?? ''
  if (!uri.startsWith('mongodb')) uri = `mongodb://${uri}`
  const user = src.mongoUser ? encodeURIComponent(src.mongoUser) : ''
  const pass = src.mongoPassword ? encodeURIComponent(src.mongoPassword) : ''
  if (user || pass) {
    const creds = pass ? `${user}:${pass}@` : `${user}@`
    uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)/, `$1${creds}`)
  }
  return uri
}

/** Stable key based only on data-affecting fields — name changes don't trigger refetch */
function cacheKey(src: DataSource) {
  if (src.type === 'upload')
    return `upload:${src.csvFileName ?? ''}:${src.csvContent?.length ?? 0}`
  if (src.type === 'mongo')
    return `mongo:${src.mongoUri}:${src.mongoUser ?? ''}:${src.mongoPassword ?? ''}:${src.mongoDb}:${src.mongoCollection}:${src.mongoFilter ?? ''}:${src.mongoLimit ?? 1000}`
  return `${src.type}:${src.csvFile}:${src.apiUrl}:${src.apiPath}`
}

export function useMultiSourceData(sources: DataSource[]): State {
  const [state, setState] = useState<State>({})
  const keysRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const currentIds = new Set(sources.map(s => s.id))

    // Remove entries for deleted sources
    setState(prev => {
      const stale = Object.keys(prev).filter(id => !currentIds.has(id))
      if (!stale.length) return prev
      const next = { ...prev }
      stale.forEach(id => { delete next[id]; keysRef.current.delete(id) })
      return next
    })

    const controllers: AbortController[] = []
    const inflight: string[] = []   // source IDs that got a new fetch this run

    for (const src of sources) {
      const key = cacheKey(src)
      if (keysRef.current.get(src.id) === key) continue  // nothing changed for this source

      keysRef.current.set(src.id, key)

      const hasConfig = src.type === 'csv'    ? !!src.csvFile
        : src.type === 'upload' ? !!src.csvContent
        : src.type === 'mongo'  ? !!(src.mongoUri && src.mongoDb && src.mongoCollection)
        : !!src.apiUrl
      if (!hasConfig) {
        setState(prev => ({ ...prev, [src.id]: EMPTY }))
        continue
      }

      const ctrl = new AbortController()
      controllers.push(ctrl)
      inflight.push(src.id)
      setState(prev => ({ ...prev, [src.id]: LOADING }))

      const capturedId = src.id
      loadSource(src, ctrl.signal).then(data => {
        if (ctrl.signal.aborted || data === null) return
        setState(prev => ({ ...prev, [capturedId]: data }))
      })
    }

    return () => {
      controllers.forEach(c => c.abort())
      // Reset cache keys for in-flight sources so the next effect run will
      // restart them instead of skipping (which would leave state stuck at LOADING).
      inflight.forEach(id => keysRef.current.delete(id))
    }
  }, [sources])

  return state
}
