import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { MarketplaceBanner, MediaImage, inr } from '../components/ListingCard'
import { MessageButton } from '../components/MessageButton'
import { Badge, Button, Card, EmptyState, ErrorState, LinkButton, Skeleton } from '../components/ui/basic'
import { DemoBadge } from '../components/ui/extras'
import { useToast } from '../components/ui/Toast'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import type { ListingItem, Person } from '../typesCraft'

export default function ListingDetailPage() {
  const { id = '' } = useParams()
  const { data, error, loading, reload } = useApi<{ listing: ListingItem; craftsperson: Person }>(`/api/listings/${encodeURIComponent(id)}`)
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [current, setCurrent] = useState(0)
  const [delError, setDelError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  usePageTitle(data?.listing.title ?? 'Listing')

  if (loading && !data) return <div className="container-page py-8"><Skeleton className="h-96" /></div>
  if (error?.status === 404) return <div className="container-page py-12"><EmptyState title="We could not find that listing" text="It may have been deleted." action={<LinkButton to="/marketplace">See all listings</LinkButton>} /></div>
  if (error || !data) return <div className="container-page py-12"><ErrorState message={error?.message ?? 'Could not load this listing.'} onRetry={reload} /></div>

  const l = data.listing
  const c = data.craftsperson
  const mine = user?.id === c.id

  const remove = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    setDeleting(true)
    try {
      await apiFetch(`/api/listings/${l.id}`, { method: 'DELETE' })
      toast('Listing deleted.')
      nav('/marketplace')
    } catch (e) {
      setDelError(e instanceof ApiError ? e.message : 'Could not delete the listing.')
      setDeleting(false)
    }
  }

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link to="/marketplace" className="hover:underline">Marketplace</Link> <span aria-hidden="true">/</span> <span aria-current="page">{l.title}</span>
      </nav>
      <MarketplaceBanner />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <MediaImage src={l.images[current]} alt={`${l.title}, picture ${current + 1} of ${l.images.length}`} className="aspect-[4/3] w-full overflow-hidden rounded-card bg-parchment-200" />
          {l.images.length > 1 && (
            <ul className="mt-3 flex gap-2" aria-label="Gallery">
              {l.images.map((src, i) => (
                <li key={src}>
                  <button type="button" onClick={() => setCurrent(i)} aria-label={`Show picture ${i + 1}`} aria-current={i === current} className={`h-16 w-20 overflow-hidden rounded-control border-2 ${i === current ? 'border-terracotta' : 'border-transparent'}`}>
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {l.credit && <p className="mt-3 text-xs text-muted">{l.credit}</p>}
        </div>
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <DemoBadge show={l.is_demo} />
            <Badge tone="neutral" className="capitalize">{l.art_form}</Badge>
          </div>
          <h1 className="text-3xl font-semibold" dir="auto">{l.title}</h1>
          <p className="mt-2 text-lg"><span className="text-muted">Indicative price </span><strong>{inr(l.price_inr)}</strong></p>
          <p className="mt-4 whitespace-pre-line" dir="auto">{l.description || 'No description.'}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-semibold">Size</dt><dd>{l.size || 'Not stated'}</dd>
            <dt className="font-semibold">Materials</dt><dd>{l.materials || 'Not stated'}</dd>
          </dl>
          <Card className="mt-6 p-4">
            <p className="text-sm text-muted">Craftsperson</p>
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <Link to={`/craftspeople/${c.id}`} className="hover:underline">{c.display_name}</Link> <DemoBadge show={c.is_demo} />
            </p>
            <p className="text-sm text-muted">{c.region}</p>
            <p className="mt-2 rounded-control bg-ochre-50 p-2 text-xs">Profiles are not verified in this demo.</p>
            <div className="mt-3"><MessageButton toUserId={c.id} contextType="listing" contextId={l.id} label="Message the craftsperson" /></div>
          </Card>
          {mine && (
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton to={`/marketplace/${l.id}/edit`} variant="outline"><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</LinkButton>
              <Button variant="outline" onClick={remove} disabled={deleting}><Trash2 className="h-4 w-4" aria-hidden="true" /> {deleting ? 'Deleting...' : 'Delete'}</Button>
              {delError && <p role="alert" className="w-full text-sm text-terracotta-dark">{delError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
