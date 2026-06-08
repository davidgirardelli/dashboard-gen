export type CsvRow = Record<string, string>

export function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function toNumber(rows: CsvRow[], ...keys: string[]): Record<string, number>[] {
  return rows.map(row => {
    const out: Record<string, number> = {}
    for (const k of keys) out[k] = parseFloat(row[k])
    return out
  })
}
