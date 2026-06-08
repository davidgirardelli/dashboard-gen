import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AlertItem } from '@/types/dashboard'

type Variant = AlertItem['variant']

const VARIANTS: { value: Variant; label: string; color: string }[] = [
  { value: 'info',    label: 'Info',    color: '#C2CECB' },
  { value: 'success', label: 'Sucesso', color: '#A2D133' },
  { value: 'warning', label: 'Aviso',   color: '#E26D13' },
]

interface Props {
  item: AlertItem
  onUpdate: (patch: Partial<AlertItem>) => void
}

export function AlertItemView({ item, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      {/* Variant selector */}
      <div className="flex gap-2">
        {VARIANTS.map(v => (
          <button
            key={v.value}
            onClick={() => onUpdate({ variant: v.value })}
            className={cn(
              'text-xs px-2 py-1 rounded-md border transition-colors',
              item.variant === v.value
                ? 'border-transparent text-[#0D1F22] font-medium'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
            style={item.variant === v.value ? { backgroundColor: v.color } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Edit mode */}
      <Input
        value={item.title}
        onChange={e => onUpdate({ title: e.target.value })}
        placeholder="Título do alerta…"
        className="bg-transparent border-border"
      />
      <Textarea
        value={item.message}
        onChange={e => onUpdate({ message: e.target.value })}
        placeholder="Mensagem…"
        className="min-h-[60px] bg-transparent border-border"
      />

      {/* Preview */}
      <Alert variant={item.variant}>
        <AlertTitle>{item.title || 'Título'}</AlertTitle>
        <AlertDescription>{item.message || 'Mensagem do alerta.'}</AlertDescription>
      </Alert>
    </div>
  )
}
