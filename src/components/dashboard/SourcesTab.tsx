import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SourceCard } from './SourceCard'
import type { DataSource, SourceData } from '@/types/source'

function uid() { return Math.random().toString(36).slice(2, 9) }

function makeSource(): DataSource {
  return { id: uid(), name: 'Nova fonte', type: 'csv', csvFile: '', apiUrl: '', apiPath: '' }
}

interface Props {
  sources: DataSource[]
  sourcesData: Record<string, SourceData>
  onSources: React.Dispatch<React.SetStateAction<DataSource[]>>
}

export function SourcesTab({ sources, sourcesData, onSources }: Props) {
  const add    = () => onSources(prev => [...prev, makeSource()])
  const remove = (id: string) => onSources(prev => prev.filter(s => s.id !== id))
  const update = (id: string, patch: Partial<DataSource>) =>
    onSources(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Fontes de dados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada fonte pode ser usada por qualquer componente na aba Main
          </p>
        </div>
        <Button onClick={add} size="sm">
          <Plus className="h-3.5 w-3.5" />
          Adicionar fonte
        </Button>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed border-border text-muted-foreground text-sm gap-3">
          <p>Nenhuma fonte configurada</p>
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar primeira fonte
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map(src => (
            <SourceCard
              key={src.id}
              source={src}
              data={sourcesData[src.id]}
              onUpdate={patch => update(src.id, patch)}
              onRemove={() => remove(src.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
