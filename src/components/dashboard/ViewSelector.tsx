import { useState, useRef, useEffect } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardView } from '@/types/view'

interface Props {
  views: DashboardView[]
  activeViewId: string
  onSwitch: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function ViewSelector({ views, activeViewId, onSwitch, onCreate, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) inputRef.current?.select()
  }, [editingId])

  const startEdit = (view: DashboardView) => {
    setEditingId(view.id)
    setEditValue(view.name)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim())
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
      {views.map(view => (
        <div
          key={view.id}
          className={cn(
            'group flex items-center gap-1 rounded-md px-2 h-7 text-xs font-medium shrink-0 transition-colors cursor-pointer select-none',
            view.id === activeViewId
              ? 'bg-primary text-[#0D1F22]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          onClick={() => { if (editingId !== view.id) onSwitch(view.id) }}
        >
          {editingId === view.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              }}
              onClick={e => e.stopPropagation()}
              className="bg-transparent outline-none w-24 min-w-0"
              style={{ colorScheme: 'dark' }}
            />
          ) : (
            <span
              className="max-w-[120px] truncate"
              onDoubleClick={e => { e.stopPropagation(); startEdit(view) }}
            >
              {view.name}
            </span>
          )}

          {/* Action buttons — shown on hover when not editing */}
          {editingId !== view.id && (
            <div className={cn(
              'flex items-center gap-0.5 transition-opacity',
              view.id === activeViewId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
              <button
                title="Renomear (duplo clique no nome)"
                onClick={e => { e.stopPropagation(); startEdit(view) }}
                className={cn(
                  'rounded p-0.5 transition-colors',
                  view.id === activeViewId
                    ? 'hover:bg-black/20'
                    : 'hover:bg-accent hover:text-foreground'
                )}
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              {views.length > 1 && (
                <button
                  title="Excluir visão"
                  onClick={e => { e.stopPropagation(); onDelete(view.id) }}
                  className={cn(
                    'rounded p-0.5 transition-colors',
                    view.id === activeViewId
                      ? 'hover:bg-black/20'
                      : 'hover:bg-accent hover:text-foreground'
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={onCreate}
        title="Nova visão"
        className="flex items-center gap-1 rounded-md px-2 h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      >
        <Plus className="h-3 w-3" />
        Nova
      </button>
    </div>
  )
}
