import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Trash2, Database, Globe, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { useManifest } from '@/hooks/useManifest'
import type { DataSource, SourceData } from '@/types/source'

const LIME = '#A2D133'

interface Props {
  source: DataSource
  data: SourceData | undefined
  onUpdate: (patch: Partial<DataSource>) => void
  onRemove: () => void
}

export function SourceCard({ source, data, onUpdate, onRemove }: Props) {
  const files = useManifest()
  const [localUrl,  setLocalUrl]  = useState(source.apiUrl)
  const [localPath, setLocalPath] = useState(source.apiPath)

  // Keep local state in sync if parent resets the source
  useEffect(() => { setLocalUrl(source.apiUrl)  }, [source.apiUrl])
  useEffect(() => { setLocalPath(source.apiPath) }, [source.apiPath])

  const applyApi = () => onUpdate({ apiUrl: localUrl.trim(), apiPath: localPath.trim() })

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header: icon · name · type toggle · remove */}
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <Input
          value={source.name}
          onChange={e => onUpdate({ name: e.target.value })}
          placeholder="Nome da fonte"
          className="text-sm font-medium flex-1 h-8"
        />

        <div className="flex gap-1">
          {(['csv', 'api'] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdate({ type: t })}
              className={cn(
                'flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium transition-colors',
                source.type === t
                  ? 'bg-primary text-[#0D1F22]'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'csv' ? <FileText className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remover fonte"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* CSV config */}
      {source.type === 'csv' && (
        <NativeSelect
          label="Arquivo CSV"
          value={source.csvFile}
          onChange={e => onUpdate({ csvFile: e.target.value })}
        >
          <option value="">— selecione um arquivo —</option>
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </NativeSelect>
      )}

      {/* API config */}
      {source.type === 'api' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={localUrl}
              onChange={e => setLocalUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyApi()}
              placeholder="https://api.exemplo.com/dados"
              className="font-mono text-xs h-8"
            />
            <span className="text-[10px] text-muted-foreground">URL da API</span>
          </div>
          <div className="w-36">
            <Input
              value={localPath}
              onChange={e => setLocalPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyApi()}
              placeholder="caminho (ex: curve)"
              className="font-mono text-xs h-8"
            />
            <span className="text-[10px] text-muted-foreground">Caminho (opcional)</span>
          </div>
          <div className="flex items-start pt-0">
            <Button size="sm" variant="outline" onClick={applyApi} className="h-8 mt-0">
              Buscar
            </Button>
          </div>
        </div>
      )}

      {/* Status */}
      {data && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs',
          data.loading                              ? 'text-muted-foreground' :
          data.error                                ? 'text-destructive' :
          data.data.length > 0                      ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {data.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {!data.loading && !data.error && data.data.length > 0 &&
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: LIME }} />}
          {!data.loading && data.error &&
            <AlertCircle className="h-3.5 w-3.5" />}

          {data.loading
            ? 'Carregando…'
            : data.error
              ? data.error
              : data.data.length > 0
                ? <>
                    {data.resolvedPath && (
                      <span className="font-mono mr-1.5 px-1 py-0.5 rounded bg-secondary text-foreground">
                        {data.resolvedPath}
                      </span>
                    )}
                    {data.data.length} registros · colunas: {data.headers.join(', ')}
                  </>
                : 'Configure a fonte acima para carregar dados'}
        </div>
      )}
    </div>
  )
}
