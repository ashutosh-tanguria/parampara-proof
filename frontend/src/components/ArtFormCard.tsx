import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ArtFormSummary } from '../types'
import { ResponsiveImage } from './ResponsiveImage'
import { Badge } from './ui/basic'

export function StyleBadge({ automated }: { automated: boolean }) {
  return automated ? <Badge tone="forest">Style analysis</Badge> : <Badge tone="ochre">Knowledge archive</Badge>
}

export function ArtFormCard({ form }: { form: ArtFormSummary }) {
  return (
    <Link
      to={`/art-forms/${form.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-parchment-300 bg-parchment-50 shadow-warm transition-shadow hover:shadow-warm-lg"
    >
      <ResponsiveImage
        slug={form.image_slug}
        ratio="4 / 3"
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
        fallbackLabel="Reference image coming soon"
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{form.name}</h3>
          <StyleBadge automated={form.automated_supported} />
        </div>
        <p className="flex-1 text-sm text-muted">{form.subtitle}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-terracotta-text">
          Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
