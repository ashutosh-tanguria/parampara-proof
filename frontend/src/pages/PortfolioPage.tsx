import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Palette, User } from 'lucide-react'
import { Badge, Card, EmptyState, LinkButton } from '../components/ui/basic'
import { Tabs } from '../components/ui/Tabs'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { useArtForms } from '../lib/artForms'
import { usePageTitle } from '../lib/hooks'
import { KEYS, readJSON } from '../lib/storage'
import type { HistoryEntry } from '../types'

export default function PortfolioPage() {
  usePageTitle('My Portfolio')
  const { forms } = useArtForms()
  const [tab, setTab] = useState('analysed')
  const history = readJSON<HistoryEntry[]>(KEYS.history, [])
  const savedSlugs = readJSON<string[]>(KEYS.saved, [])
  const saved = savedSlugs.map((s) => forms.find((f) => f.slug === s)).filter((f): f is NonNullable<typeof f> => !!f)

  const analysed = history.length ? (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {history.map((h) => (
        <li key={h.id}>
          <Link to={`/analysis/${h.id}`} className="block">
            <Card className="overflow-hidden transition-shadow hover:shadow-warm-lg">
              <img src={h.image_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="aspect-[4/3] w-full bg-parchment-200 object-cover" />
              <div className="p-4">
                <p className="font-semibold">{h.target_name}</p>
                <p className="text-sm text-muted">{new Date(h.created_at).toLocaleString()}</p>
                {h.style_match !== null && <Badge tone="forest" className="mt-2">Style similarity {Math.round(h.style_match * 100)}%</Badge>}
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState icon={<Palette className="h-10 w-10" aria-hidden="true" />} title="No analyses yet" text="Upload a painting to see it here." action={<LinkButton to="/analyse">Upload Your Artwork</LinkButton>} />
  )

  const savedPanel = saved.length ? (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {saved.map((f) => (
        <li key={f.slug}>
          <Link to={`/art-forms/${f.slug}`}>
            <Card className="overflow-hidden">
              <ResponsiveImage slug={f.image_slug} ratio="4 / 3" sizes="(min-width: 1024px) 380px, 92vw" />
              <p className="p-3 font-semibold">{f.name}</p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState title="Nothing saved yet" text="Use the Save button on an art form page." action={<LinkButton to="/art-forms" variant="outline">Explore Art Forms</LinkButton>} />
  )

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-white"><User className="h-8 w-8" aria-hidden="true" /></div>
        <div>
          <h1 className="text-3xl font-semibold">Guest</h1>
          <p className="text-sm text-muted">Your history and saved items are stored only in this browser. Clearing site data removes them. Uploaded images are deleted from the server after 24 hours.</p>
        </div>
      </div>
      <Tabs
        label="Portfolio sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'analysed', label: `Analysed (${history.length})`, content: analysed },
          { id: 'saved', label: `Saved (${saved.length})`, content: savedPanel },
        ]}
      />
    </div>
  )
}
