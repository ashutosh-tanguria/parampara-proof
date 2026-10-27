import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ListingItem } from '../typesCraft'
import { PatternBlock } from './ResponsiveImage'
import { Badge } from './ui/basic'
import { DemoBadge, TeacherLine } from './ui/extras'

export const BANNER_TEXT = 'Demo marketplace. No payments are taken. Listings are not verified. Authenticity checks and artist verification are planned for the next phase.'

export function MarketplaceBanner() {
  return (
    <p role="note" className="mb-6 rounded-card border border-ochre bg-ochre-50 p-3 text-sm font-medium text-[#5C3A00]">
      {BANNER_TEXT}
    </p>
  )
}

export function inr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

/** A picture served from /media with a pattern fallback if it is missing. */
export function MediaImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className={className}><PatternBlock label="No image" /></div>
  return <img src={src} alt={alt} loading="lazy" width={800} height={600} onError={() => setFailed(true)} className={`${className ?? ''} object-cover`} />
}

export function ListingCard({ l }: { l: ListingItem }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-parchment-300 bg-parchment-50 shadow-warm">
      <Link to={`/marketplace/${l.id}`} aria-label={l.title}>
        <MediaImage src={l.images[0]} alt={`${l.title} (illustration)`} className="aspect-[4/3] w-full overflow-hidden bg-parchment-200" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-2">
          <DemoBadge show={l.is_demo} />
          <Badge tone="neutral" className="capitalize">{l.art_form}</Badge>
        </div>
        <h3 className="text-lg font-semibold"><Link to={`/marketplace/${l.id}`} className="hover:underline" dir="auto">{l.title}</Link></h3>
        <p className="text-sm"><span className="text-muted">Indicative price </span><strong>{inr(l.price_inr)}</strong></p>
        <TeacherLine t={l.craftsperson} />
      </div>
    </div>
  )
}
