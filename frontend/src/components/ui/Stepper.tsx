import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export const ANALYSE_STEPS = ['Upload', 'Select Art Form', 'Analysis', 'Results'] as const

/** 1-based current step. Steps before it are shown as done. */
export function Stepper({ current, steps = ANALYSE_STEPS }: { current: number; steps?: readonly string[] }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-2 overflow-x-auto sm:gap-4">
        {steps.map((label, i) => {
          const n = i + 1
          const done = n < current
          const active = n === current
          return (
            <li key={label} className="flex shrink-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  done && 'bg-forest text-white',
                  active && 'bg-terracotta text-white',
                  !done && !active && 'bg-parchment-300 text-muted',
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : n}
              </span>
              <span className={cn('text-sm font-medium', active ? 'text-ink' : 'text-muted', !active && 'hidden sm:inline')}>
                {label}
                <span className="sr-only">{done ? ' (done)' : active ? ' (current step)' : ''}</span>
              </span>
              {n < steps.length && <span aria-hidden="true" className="hidden h-px w-6 bg-parchment-400 sm:block" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
