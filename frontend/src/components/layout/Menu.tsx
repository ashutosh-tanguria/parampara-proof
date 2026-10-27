import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A small dropdown menu: closes on outside click, Escape and when an item is chosen. */
export function Menu({ label, button, children, align = 'right' }: { label: string; button: ReactNode; children: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-control px-2 text-sm font-medium hover:bg-parchment-300/60"
      >
        {button}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn('absolute top-full z-50 mt-1 w-64 rounded-card border border-parchment-300 bg-parchment-50 p-1 shadow-warm-lg', align === 'right' ? 'right-0' : 'left-0')}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export const menuItem = 'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-control px-3 text-left text-sm font-medium hover:bg-parchment-300/60'
