import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, FolderOpen, Columns } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DetectedPath, Suggestion } from '@/hooks/useApiData'

const LIME   = '#A2D133'
const ORANGE = '#E26D13'
const GRAY   = '#C2CECB'

interface Props {
  rawJson: unknown
  detectedPaths: DetectedPath[]
  suggestions: Suggestion[]
  activePath: string
  onPathChange: (path: string) => void
  onPickSuggestion: (xKey: string, yKey: string) => void
  recordCount: number
}

export function ApiPreviewPanel({
  rawJson, detectedPaths, suggestions,
  activePath, onPathChange, onPickSuggestion,
  recordCount,
}: Props) {
  const [open, setOpen]         = useState(true)
  const [customPath, setCustomPath] = useState(activePath)

  const preview = (() => {
    if (!rawJson) return ''
    try {
      if (Array.isArray(rawJson))
        return JSON.stringify(rawJson.slice(0, 2), null, 2)
      // show root keys + first 2 items of active path
      const root = rawJson as Record<string, unknown>
      const meta = Object.fromEntries(
        Object.entries(root)
          .filter(([, v]) => !Array.isArray(v))
          .slice(0, 5)
      )
      const arr = activePath
        ? (root[activePath] as unknown[] | undefined)?.slice(0, 2)
        : undefined
      return JSON.stringify(arr ? { ...meta, [`${activePath} (prévia)`]: arr } : meta, null, 2)
    } catch { return '' }
  })()

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: LIME }} />
          Prévia da API
          <span className="text-xs text-muted-foreground font-normal ml-1">
            {recordCount} registros · {detectedPaths[0]?.numericCols.length ?? 0} colunas numéricas
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

          {/* Detected paths */}
          {detectedPaths.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                <FolderOpen className="h-3.5 w-3.5" />
                Caminhos com dados
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedPaths.map(p => (
                  <button
                    key={p.path || 'root'}
                    onClick={() => { onPathChange(p.path); setCustomPath(p.path) }}
                    className={cn(
                      'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-mono transition-colors border',
                      activePath === p.path
                        ? 'border-transparent text-[#0D1F22] font-semibold'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                    style={activePath === p.path ? { backgroundColor: LIME } : {}}
                  >
                    <span>{p.path || 'raiz'}</span>
                    <span className="opacity-60">{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom path */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
              <Columns className="h-3.5 w-3.5" />
              Caminho customizado
            </div>
            <div className="flex gap-2">
              <Input
                value={customPath}
                onChange={e => setCustomPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onPathChange(customPath)}
                placeholder="ex: data.items · curve · results"
                className="font-mono text-xs flex-1"
              />
              <Button
                size="sm" variant="outline"
                onClick={() => onPathChange(customPath)}
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Numeric columns */}
          {detectedPaths.find(p => p.path === activePath)?.numericCols && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Colunas numéricas</span>
              <div className="flex flex-wrap gap-1.5">
                {detectedPaths.find(p => p.path === activePath)!.numericCols.map(col => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded-full text-xs font-mono border border-border text-muted-foreground"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="h-3.5 w-3.5" />
                Sugestões de visualização
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onPickSuggestion(s.xKey, s.yKey)}
                    title={s.reason}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border transition-colors hover:border-transparent hover:text-[#0D1F22]"
                    style={{ '--hover-bg': LIME } as React.CSSProperties}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = LIME)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <TrendingUp className="h-3 w-3" style={{ color: i % 2 === 0 ? LIME : ORANGE }} />
                    <span className="font-mono">{s.xKey}</span>
                    <span style={{ color: GRAY }}>→</span>
                    <span className="font-mono">{s.yKey}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Clicar aplica os eixos em todos os gráficos existentes no canvas
              </p>
            </div>
          )}

          {/* JSON preview */}
          {preview && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
                Ver JSON bruto (2 itens)
              </summary>
              <pre className="mt-2 p-3 rounded-md bg-background border border-border text-xs font-mono text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
                {preview}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
