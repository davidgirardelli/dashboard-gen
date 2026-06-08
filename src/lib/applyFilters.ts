import type { DataFilter } from '@/types/dashboard'

function matchFilter(row: Record<string, unknown>, f: DataFilter): boolean {
  const raw    = row[f.field]
  const rawStr = String(raw ?? '')
  const rawNum = parseFloat(rawStr)
  const fNum   = parseFloat(f.value)

  switch (f.op) {
    case 'eq':
      return rawStr === f.value || (!isNaN(rawNum) && !isNaN(fNum) && rawNum === fNum)
    case 'neq':
      return rawStr !== f.value && (isNaN(rawNum) || isNaN(fNum) || rawNum !== fNum)
    case 'gt':  return !isNaN(rawNum) && !isNaN(fNum) && rawNum > fNum
    case 'gte': return !isNaN(rawNum) && !isNaN(fNum) && rawNum >= fNum
    case 'lt':  return !isNaN(rawNum) && !isNaN(fNum) && rawNum < fNum
    case 'lte': return !isNaN(rawNum) && !isNaN(fNum) && rawNum <= fNum
    case 'in': {
      const set = new Set(f.value.split(',').map(s => s.trim()))
      return set.has(rawStr)
    }
    case 'nin': {
      const set = new Set(f.value.split(',').map(s => s.trim()))
      return !set.has(rawStr)
    }
    case 'contains':
      return rawStr.toLowerCase().includes(f.value.toLowerCase())
    default: return true
  }
}

export function filterRows(
  allData: Record<string, unknown>[],
  filters: DataFilter[]
): Record<string, unknown>[] {
  const active = filters.filter(f => f.field && f.value !== '')
  if (!active.length) return allData
  return allData.filter(row => active.every(f => matchFilter(row, f)))
}

export function applyFilters(
  allData: Record<string, unknown>[],
  numericHeaders: string[],
  filters: DataFilter[]
): { data: Record<string, number>[]; headers: string[] } {
  const activeFilters = filters.filter(f => f.field && f.value !== '')
  if (!activeFilters.length) return {
    data: allData.map(row => Object.fromEntries(numericHeaders.map(h => [h, Number(row[h])]))),
    headers: numericHeaders,
  }
  const filtered = allData.filter(row => activeFilters.every(f => matchFilter(row, f)))
  if (!filtered.length) return { data: [], headers: numericHeaders }
  return {
    data: filtered.map(row => Object.fromEntries(numericHeaders.map(h => [h, Number(row[h])]))),
    headers: numericHeaders,
  }
}

export function isNumericField(allData: Record<string, unknown>[], field: string): boolean {
  const sample = allData.find(r => r[field] != null && r[field] !== '')
  if (!sample) return true
  const v = sample[field]
  return typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')
}

export function distinctValues(allData: Record<string, unknown>[], field: string): string[] {
  const vals = new Set(allData.map(r => String(r[field] ?? '')))
  vals.delete('')
  return [...vals].sort()
}
