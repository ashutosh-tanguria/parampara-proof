import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { ListingCard, MarketplaceBanner } from '../components/ListingCard'
import { Chip, EmptyState, ErrorState, LinkButton, SectionHeader, Skeleton } from '../components/ui/basic'
import { inputClass } from '../components/ui/extras'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import { ART_FORM_OPTIONS, type ListingItem } from '../typesCraft'

export default function MarketplacePage() {
  usePageTitle('Marketplace')
  const { user } = useAuth()
  const [art, setArt] = useState('')
  const [q, setQ] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [debounced, setDebounced] = useState({ q: '', min: '', max: '' })
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q: q.trim(), min, max }), 300)
    return () => clearTimeout(t)
  }, [q, min, max])

  const params = new URLSearchParams()
  if (art) params.set('art_form', art)
  if (debounced.q) params.set('q', debounced.q)
  if (Number(debounced.min) > 0) params.set('min_price', String(Math.floor(Number(debounced.min))))
  if (Number(debounced.max) > 0) params.set('max_price', String(Math.floor(Number(debounced.max))))
  const { data, error, loading, reload } = useApi<{ listings: ListingItem[]; total: number }>(`/api/listings?${params}`)
  const craft = user?.role === 'craftsperson'

  return (
    <div className="container-page py-8">
      <SectionHeader as="h1" title="Marketplace" subtitle="Browse and enquire. There is no checkout: message the craftsperson to ask about a piece." action={craft ? <LinkButton to="/marketplace/new"><Plus className="h-4 w-4" aria-hidden="true" /> Add a listing</LinkButton> : undefined} />
      <MarketplaceBanner />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="m-search" className="sr-only">Search listings</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="m-search" type="search" value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))} placeholder="Search listings or craftspeople" className="min-h-[48px] w-full rounded-full border border-parchment-400 bg-parchment-50 pl-12 pr-4" />
        </div>
        <div>
          <label htmlFor="m-min" className="sr-only">Minimum indicative price in rupees</label>
          <input id="m-min" type="number" min={0} inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min price (INR)" className={`${inputClass} sm:w-40`} />
        </div>
        <div>
          <label htmlFor="m-max" className="sr-only">Maximum indicative price in rupees</label>
          <input id="m-max" type="number" min={0} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max price (INR)" className={`${inputClass} sm:w-40`} />
        </div>
      </div>
      <div role="group" aria-label="Filter by art form" className="mb-6 flex flex-wrap gap-2">
        <Chip active={art === ''} onClick={() => setArt('')}>All</Chip>
        {ART_FORM_OPTIONS.map(([v, l]) => <Chip key={v} active={art === v} onClick={() => setArt(v)}>{l}</Chip>)}
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : data && data.listings.length === 0 ? (
        <EmptyState title="No listings found" text={art || debounced.q || min || max ? 'Try different filters.' : 'No listings have been added yet.'} action={craft ? <LinkButton to="/marketplace/new">Add a listing</LinkButton> : undefined} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {data?.listings.map((l) => <li key={l.id}><ListingCard l={l} /></li>)}
        </ul>
      )}
    </div>
  )
}
