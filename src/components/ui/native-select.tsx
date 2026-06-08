import { type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function NativeSelect({ label, className, children, ...props }: Props) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>}
      <select
        className={cn(
          'h-8 rounded-md border border-border bg-card text-foreground text-sm px-2 pr-7',
          'appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary',
          'bg-no-repeat bg-[right_0.5rem_center]',
          className
        )}
        style={{
          colorScheme: 'dark',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C2CECB' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
