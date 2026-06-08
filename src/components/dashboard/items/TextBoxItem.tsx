import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TextBoxItem } from '@/types/dashboard'

interface Props {
  item: TextBoxItem
  onUpdate: (patch: Partial<TextBoxItem>) => void
}

export function TextBoxItemView({ item, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <Input
        value={item.title}
        onChange={e => onUpdate({ title: e.target.value })}
        placeholder="Título…"
        className="font-semibold text-base h-9 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 bg-transparent"
      />
      <Textarea
        value={item.content}
        onChange={e => onUpdate({ content: e.target.value })}
        placeholder="Escreva aqui…"
        className="min-h-[120px] bg-transparent border-border"
      />
    </div>
  )
}
