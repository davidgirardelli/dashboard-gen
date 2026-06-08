import { useEffect, useState } from 'react'
import { parseCsv, toNumber, type CsvRow } from '@/lib/parseCsv'

interface CsvState {
  raw: CsvRow[]
  headers: string[]
  loading: boolean
  error: string | null
}

export function useCsvData(url: string, numericKeys?: string[]) {
  const [state, setState] = useState<CsvState>({
    raw: [],
    headers: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    setState(s => ({ ...s, loading: true, error: null }))
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(text => {
        const raw = parseCsv(text)
        const headers = raw.length > 0 ? Object.keys(raw[0]) : []
        setState({ raw, headers, loading: false, error: null })
      })
      .catch(err => {
        setState(s => ({ ...s, loading: false, error: String(err) }))
      })
  }, [url])

  const keys = numericKeys ?? state.headers
  const data = toNumber(state.raw, ...keys)

  return { data, headers: state.headers, loading: state.loading, error: state.error }
}
