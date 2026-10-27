import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

/** Accessible tabs: roving tabindex, arrow/Home/End keys. */
export function Tabs({ items, value, onChange, label, className }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string }) {
  const uid = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = items.findIndex((t) => t.id === value)
    const moves: Record<string, number> = {
      ArrowRight: (idx + 1) % items.length,
      ArrowLeft: (idx - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }
    const next = moves[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(items[next].id)
    refs.current[items[next].id]?.focus()
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKey} className="-mx-4 flex gap-1 overflow-x-auto border-b border-parchment-300 px-4 sm:mx-0 sm:px-0">
        {items.map((t) => {
          const selected = t.id === value
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el
              }}
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cn(
                'min-h-[44px] shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                selected ? 'border-terracotta text-terracotta-text' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {items.map((t) => (
        <div key={t.id} role="tabpanel" id={`${uid}-panel-${t.id}`} aria-labelledby={`${uid}-tab-${t.id}`} hidden={t.id !== value} className="pt-6">
          {t.id === value && t.content}
        </div>
      ))}
    </div>
  )
}
