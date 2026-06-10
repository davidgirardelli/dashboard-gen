import { useState, useEffect } from 'react'
import {
  Loader2, CheckCircle2, AlertCircle, Trash2,
  Database, Globe, FileText, Upload, DatabaseZap, Eye, EyeOff,
} from 'lucide-react'
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

const TYPE_CONFIG = [
  { type: 'csv'    as const, label: 'Base',    Icon: FileText    },
  { type: 'upload' as const, label: 'Upload',  Icon: Upload      },
  { type: 'api'    as const, label: 'API',     Icon: Globe       },
  { type: 'mongo'  as const, label: 'MongoDB', Icon: DatabaseZap },
]

export function SourceCard({ source, data, onUpdate, onRemove }: Props) {
  const files = useManifest()

  // API local state
  const [localUrl,  setLocalUrl]  = useState(source.apiUrl)
  const [localPath, setLocalPath] = useState(source.apiPath)
  useEffect(() => { setLocalUrl(source.apiUrl)  }, [source.apiUrl])
  useEffect(() => { setLocalPath(source.apiPath) }, [source.apiPath])
  const applyApi = () => onUpdate({ apiUrl: localUrl.trim(), apiPath: localPath.trim() })

  // MongoDB local state
  const [localUri,    setLocalUri]    = useState(source.mongoUri        ?? '')
  const [localUser,   setLocalUser]   = useState(source.mongoUser       ?? '')
  const [localPass,   setLocalPass]   = useState(source.mongoPassword   ?? '')
  const [localDb,     setLocalDb]     = useState(source.mongoDb         ?? '')
  const [localCol,    setLocalCol]    = useState(source.mongoCollection  ?? '')
  const [localFilter, setLocalFilter] = useState(source.mongoFilter     ?? '')
  const [localLimit,  setLocalLimit]  = useState(String(source.mongoLimit ?? 1000))
  const [showPass,    setShowPass]    = useState(false)

  useEffect(() => { setLocalUri(source.mongoUri      ?? '') }, [source.mongoUri])
  useEffect(() => { setLocalUser(source.mongoUser    ?? '') }, [source.mongoUser])
  useEffect(() => { setLocalPass(source.mongoPassword ?? '') }, [source.mongoPassword])
  useEffect(() => { setLocalDb(source.mongoDb        ?? '') }, [source.mongoDb])
  useEffect(() => { setLocalCol(source.mongoCollection ?? '') }, [source.mongoCollection])
  useEffect(() => { setLocalFilter(source.mongoFilter ?? '') }, [source.mongoFilter])
  useEffect(() => { setLocalLimit(String(source.mongoLimit ?? 1000)) }, [source.mongoLimit])

  const applyMongo = () => onUpdate({
    mongoUri:        localUri.trim(),
    mongoUser:       localUser.trim(),
    mongoPassword:   localPass,
    mongoDb:         localDb.trim(),
    mongoCollection: localCol.trim(),
    mongoFilter:     localFilter.trim(),
    mongoLimit:      parseInt(localLimit) || 1000,
  })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onUpdate({ csvContent: text, csvFileName: file.name })
    e.target.value = ''
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <Input
          value={source.name}
          onChange={e => onUpdate({ name: e.target.value })}
          placeholder="Nome da fonte"
          className="text-sm font-medium flex-1 h-8"
        />

        <div className="flex gap-1 flex-wrap">
          {TYPE_CONFIG.map(({ type: t, label, Icon }) => (
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
              <Icon className="h-3 w-3" />
              {label}
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

      {/* Base (csv) */}
      {source.type === 'csv' && (
        <NativeSelect
          label="Arquivo base"
          value={source.csvFile}
          onChange={e => onUpdate({ csvFile: e.target.value })}
        >
          <option value="">— selecione um arquivo —</option>
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </NativeSelect>
      )}

      {/* Upload */}
      {source.type === 'upload' && (
        <div className="flex items-center gap-2">
          <label className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-md border cursor-pointer transition-colors text-xs',
            'border-border bg-secondary hover:bg-accent text-foreground'
          )}>
            <Upload className="h-3.5 w-3.5 flex-shrink-0" />
            {source.csvFileName ? 'Trocar arquivo' : 'Escolher arquivo .csv'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
          {source.csvFileName && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">
              {source.csvFileName}
            </span>
          )}
        </div>
      )}

      {/* API */}
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
          <div className="flex items-start">
            <Button size="sm" variant="outline" onClick={applyApi} className="h-8">
              Buscar
            </Button>
          </div>
        </div>
      )}

      {/* MongoDB */}
      {source.type === 'mongo' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">

            {/* URI — sem credenciais */}
            <div className="col-span-2">
              <Input
                value={localUri}
                onChange={e => setLocalUri(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                placeholder="mongodb://mongo:27017/?authSource=admin"
                className="font-mono text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                URI de conexão (sem credenciais)
              </span>
            </div>

            {/* Usuário */}
            <div>
              <Input
                value={localUser}
                onChange={e => setLocalUser(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                placeholder="admin"
                className="font-mono text-xs h-8"
                autoComplete="username"
              />
              <span className="text-[10px] text-muted-foreground">Usuário</span>
            </div>

            {/* Senha com toggle show/hide */}
            <div>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={localPass}
                  onChange={e => setLocalPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyMongo()}
                  placeholder="••••••••"
                  className="font-mono text-xs h-8 pr-8"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPass
                    ? <EyeOff className="h-3.5 w-3.5" />
                    : <Eye    className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">Senha</span>
            </div>

            {/* Database */}
            <div>
              <Input
                value={localDb}
                onChange={e => setLocalDb(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                placeholder="nome_do_banco"
                className="font-mono text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">Database</span>
            </div>

            {/* Collection */}
            <div>
              <Input
                value={localCol}
                onChange={e => setLocalCol(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                placeholder="nome_da_colecao"
                className="font-mono text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">Collection</span>
            </div>

            {/* Filtro */}
            <div>
              <Input
                value={localFilter}
                onChange={e => setLocalFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                placeholder='{"campo": "valor"}'
                className="font-mono text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">Filtro JSON (opcional)</span>
            </div>

            {/* Limite */}
            <div>
              <Input
                type="number"
                value={localLimit}
                onChange={e => setLocalLimit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyMongo()}
                min={1} max={10000}
                className="font-mono text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">Limite de documentos</span>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={applyMongo} className="h-8">
            <DatabaseZap className="h-3.5 w-3.5 mr-1.5" />
            Conectar
          </Button>
        </div>
      )}

      {/* Status */}
      {data && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs',
          data.loading         ? 'text-muted-foreground' :
          data.error           ? 'text-destructive' :
          data.data.length > 0 ? 'text-foreground' : 'text-muted-foreground'
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
