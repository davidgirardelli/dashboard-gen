import { useEffect, useRef, useState } from 'react'

type Row = Record<string, number>

export interface DetectedPath {
  path: string
  count: number
  numericCols: string[]
}

export interface Suggestion {
  xKey: string
  yKey: string
  label: string
  reason: string
}

interface ApiState {
  data: Row[]
  headers: string[]
  loading: boolean
  error: string | null
  rawJson: unknown
  detectedPaths: DetectedPath[]
  suggestions: Suggestion[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>))
      return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function isArrayOfObjects(val: unknown): val is Record<string, unknown>[] {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null
}

/** Scan the first two levels of a JSON object for keys whose value is an array of objects */
function detectPaths(json: unknown): DetectedPath[] {
  if (!json || typeof json !== 'object') return []
  const results: DetectedPath[] = []

  const scan = (obj: Record<string, unknown>, prefix: string) => {
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (isArrayOfObjects(val)) {
        const numericCols = Object.keys(val[0]).filter(k =>
          typeof val[0][k] === 'number' || (!isNaN(Number(val[0][k])) && val[0][k] !== '')
        )
        results.push({ path, count: val.length, numericCols })
      } else if (val && typeof val === 'object' && !Array.isArray(val) && prefix === '') {
        scan(val as Record<string, unknown>, key)
      }
    }
  }

  if (isArrayOfObjects(json)) {
    const numericCols = Object.keys(json[0]).filter(k =>
      typeof json[0][k] === 'number' || (!isNaN(Number(json[0][k])) && json[0][k] !== '')
    )
    results.unshift({ path: '', count: json.length, numericCols })
  } else {
    scan(json as Record<string, unknown>, '')
  }

  return results
}

/** Heuristic: column whose values are monotonically increasing in >80% of steps → dimension (X axis) */
function isMonotonic(rows: Record<string, unknown>[], key: string): boolean {
  const vals = rows.map(r => Number(r[key])).filter(v => !isNaN(v))
  if (vals.length < 3) return false
  let ups = 0
  for (let i = 1; i < vals.length; i++) if (vals[i] > vals[i - 1]) ups++
  return ups / (vals.length - 1) > 0.75
}

function makeSuggestions(rows: Record<string, unknown>[], numericCols: string[]): Suggestion[] {
  if (numericCols.length < 2) return []

  const dims    = numericCols.filter(c => isMonotonic(rows, c))
  const metrics = numericCols.filter(c => !dims.includes(c))

  // dims × metrics pairs first, then dims × dims if no metrics found
  const pairs: Suggestion[] = []
  const yPool = metrics.length ? metrics : numericCols.slice(1)
  const xPool = dims.length    ? dims    : numericCols.slice(0, -1)

  for (const yKey of yPool) {
    for (const xKey of xPool) {
      if (xKey === yKey) continue
      pairs.push({
        xKey, yKey,
        label: `${xKey} → ${yKey}`,
        reason: dims.includes(xKey)
          ? `${xKey} é sequencial (bom eixo X)`
          : `${xKey} vs ${yKey}`,
      })
    }
  }

  return pairs.slice(0, 5)
}

function extractRows(json: unknown, path: string): { rows: Record<string, unknown>[]; error: string | null } {
  const target = path === '' ? json : getByPath(json, path)
  if (!isArrayOfObjects(target))
    return { rows: [], error: `Caminho "${path}" não retornou um array de objetos` }
  return { rows: target, error: null }
}

function toNumeric(rows: Record<string, unknown>[], cols: string[]): Row[] {
  return rows.map(r => Object.fromEntries(cols.map(c => [c, Number(r[c])])))
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY: ApiState = {
  data: [], headers: [], loading: false, error: null,
  rawJson: null, detectedPaths: [], suggestions: [],
}

export function useApiData(url: string | null, customPath?: string) {
  const rawRef = useRef<unknown>(null)
  const [state, setState] = useState<ApiState>(EMPTY)

  // Fetch when URL changes
  useEffect(() => {
    if (!url) { setState(EMPTY); return }
    setState(s => ({ ...s, loading: true, error: null }))
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((json: unknown) => {
        rawRef.current = json
        const paths = detectPaths(json)
        const bestPath = paths[0]?.path ?? ''
        const { rows, error } = extractRows(json, bestPath)
        if (error || !rows.length) {
          setState(s => ({ ...s, loading: false, error: error ?? 'Sem dados', rawJson: json, detectedPaths: paths }))
          return
        }
        const cols = paths[0]?.numericCols ?? []
        setState({
          data: toNumeric(rows, cols),
          headers: cols,
          loading: false, error: null,
          rawJson: json,
          detectedPaths: paths,
          suggestions: makeSuggestions(rows, cols),
        })
      })
      .catch(err => setState(s => ({ ...s, loading: false, error: String(err) })))
  }, [url])

  // Re-extract when customPath changes (no re-fetch)
  useEffect(() => {
    if (customPath === undefined || !rawRef.current) return
    const { rows, error } = extractRows(rawRef.current, customPath)
    if (error || !rows.length) {
      setState(s => ({ ...s, error: error ?? 'Sem dados', data: [], headers: [] }))
      return
    }
    const cols = Object.keys(rows[0]).filter(k =>
      typeof rows[0][k] === 'number' || (!isNaN(Number(rows[0][k])) && rows[0][k] !== '')
    )
    setState(s => ({
      ...s, error: null,
      data: toNumeric(rows, cols),
      headers: cols,
      suggestions: makeSuggestions(rows, cols),
    }))
  }, [customPath])

  return state
}
