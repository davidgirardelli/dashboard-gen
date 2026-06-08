import { useState } from 'react'
import { FileText, Globe, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiPreviewPanel } from './ApiPreviewPanel'
import { useManifest } from '@/hooks/useManifest'
import { cn } from '@/lib/utils'
import type { DetectedPath, Suggestion } from '@/hooks/useApiData'

export type SourceType = 'csv' | 'api'

interface Props {
  sourceType: SourceType
  onSourceType: (t: SourceType) => void
  csvFile: string
  onCsvFile: (f: string) => void
  onApiFetch: (url: string) => void
  apiLoading: boolean
  apiError: string | null
  apiSuccess: boolean
  // API preview data
  rawJson: unknown
  detectedPaths: DetectedPath[]
  suggestions: Suggestion[]
  apiActivePath: string
  onApiPathChange: (path: string) => void
  onPickSuggestion: (xKey: string, yKey: string) => void
  recordCount: number
}

export function DataSourcePanel({
  sourceType, onSourceType,
  csvFile, onCsvFile,
  onApiFetch, apiLoading, apiError, apiSuccess,
  rawJson, detectedPaths, suggestions,
  apiActivePath, onApiPathChange, onPickSuggestion, recordCount,
}: Props) {
  const files = useManifest()
  const [inputUrl, setInputUrl] = useState('')

  const handleFetch = () => {
    const url = inputUrl.trim()
    if (url) onApiFetch(url)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {/* Source toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Fonte</span>
          {(['csv', 'api'] as SourceType[]).map(t => (
            <button
              key={t}
              onClick={() => onSourceType(t)}
              className={cn(
                'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors',
                sourceType === t
                  ? 'bg-primary text-[#0D1F22]'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'csv' ? <FileText className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* CSV */}
        {sourceType === 'csv' && (
          <NativeSelect label="Arquivo" value={csvFile} onChange={e => onCsvFile(e.target.value)}>
            {files.map(f => <option key={f} value={f}>{f}</option>)}
          </NativeSelect>
        )}

        {/* API */}
        {sourceType === 'api' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">URL da API</label>
            <div className="flex gap-2">
              <Input
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                placeholder="https://api.exemplo.com/dados"
                className="font-mono text-xs flex-1"
              />
              <Button onClick={handleFetch} disabled={apiLoading || !inputUrl.trim()} size="sm">
                {apiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {apiError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {apiError}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Aceita JSON: array direto ou objeto com chave aninhada (ex: <span className="font-mono">data</span>, <span className="font-mono">curve</span>, <span className="font-mono">results</span>…)
            </p>
          </div>
        )}
      </div>

      {/* API preview panel — shown after a successful fetch */}
      {sourceType === 'api' && apiSuccess && rawJson !== null && (
        <ApiPreviewPanel
          rawJson={rawJson}
          detectedPaths={detectedPaths}
          suggestions={suggestions}
          activePath={apiActivePath}
          onPathChange={onApiPathChange}
          onPickSuggestion={onPickSuggestion}
          recordCount={recordCount}
        />
      )}
    </div>
  )
}
