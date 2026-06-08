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

function rowsToData(rows: ObjArray): { headers: string[]; data: Record<string, number>[] } | null {
  const headers = Object.keys(rows[0]).filter(k => {
    const v = rows[0][k]
    return typeof v === 'number' || (v !== '' && !isNaN(Number(v)))
  })
  if (!headers.length) return null
  return { headers, data: rows.map(r => Object.fromEntries(headers.map(h => [h, Number(r[h])]))) }
}

async function loadSource(src: DataSource, signal: AbortSignal): Promise<SourceData> {
  try {
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
    if ((err as Error).name === 'AbortError') return LOADING
    return { ...EMPTY, error: String(err) }
  }
}

/** Stable key based only on data-affecting fields — name changes don't trigger refetch */
function cacheKey(src: DataSource) {
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

    for (const src of sources) {
      const key = cacheKey(src)
      if (keysRef.current.get(src.id) === key) continue  // nothing changed for this source

      keysRef.current.set(src.id, key)

      const hasConfig = src.type === 'csv' ? !!src.csvFile : !!src.apiUrl
      if (!hasConfig) {
        setState(prev => ({ ...prev, [src.id]: EMPTY }))
        continue
      }

      const ctrl = new AbortController()
      controllers.push(ctrl)
      setState(prev => ({ ...prev, [src.id]: LOADING }))

      const capturedId = src.id
      loadSource(src, ctrl.signal).then(data => {
        if (ctrl.signal.aborted) return
        setState(prev => ({ ...prev, [capturedId]: data }))
      })
    }

    return () => controllers.forEach(c => c.abort())
  }, [sources])

  return state
}
