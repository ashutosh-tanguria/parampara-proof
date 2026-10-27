import { useState } from 'react'
import { KEYS, readJSON, writeJSON } from '../../lib/storage'
import { PatternBlock } from '../ResponsiveImage'

/** Mobile-only splash shown on the first visit. Skipped on desktop widths. */
export function Splash() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return false
    return !readJSON<boolean>(KEYS.seenSplash, false)
  })
  if (!open) return null
  const start = () => {
    writeJSON(KEYS.seenSplash, true)
    setOpen(false)
  }
  return (
    <section aria-label="Welcome" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-forest px-8 text-center text-white md:hidden">
      <div className="absolute inset-0 opacity-25" aria-hidden="true">
        <PatternBlock className="bg-forest" />
      </div>
      <div className="relative flex flex-col items-center">
        <img src="/favicon.svg" alt="" width={88} height={88} className="mb-5" />
        <h1 className="text-3xl font-semibold">Parampara Proof</h1>
        <p className="mt-2 text-white/80">Learn, Create, Preserve</p>
        <button type="button" onClick={start} className="mt-10 min-h-[48px] w-full max-w-xs rounded-control bg-parchment-100 px-6 py-3 font-semibold text-forest">
          Get Started
        </button>
      </div>
    </section>
  )
}
