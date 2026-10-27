import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ArtFormCard } from '../components/ArtFormCard'
import { Chip, EmptyState, ErrorState, LinkButton, SectionHeader, Skeleton } from '../components/ui/basic'
import { useArtForms } from '../lib/artForms'
import { usePageTitle } from '../lib/hooks'

const FILTERS = ['All', 'Painting', 'Tribal Art', 'Textile', 'Pottery']

export default function ArtFormsPage() {
  usePageTitle('Art Forms')
  const { forms, loading, error, reload } = useArtForms()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (params.get('search')) input.current?.focus()
  }, [params])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return forms.filter(
      (f) =>
        (filter === 'All' || f.category === filter) &&
        (!q || [f.name, f.subtitle, f.origin, f.category].some((s) => (s ?? '').toLowerCase().includes(q))),
    )
  }, [forms, filter, query])

  return (
    <div className="container-page py-8">
      <SectionHeader as="h1" title="Explore Indian Art Forms" subtitle="Discover the heritage, stories and techniques behind traditional Indian art." />
      <div className="relative mb-4 max-w-2xl">
        <label htmlFor="art-search" className="sr-only">
          Search art forms
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={input}
          id="art-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 80))}
          placeholder="Search art forms, techniques, or regions"
          className="min-h-[48px] w-full rounded-full border border-parchment-400 bg-parchment-50 pl-12 pr-4"
        />
      </div>
      <div role="group" aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState title="No art forms match" text="Try a different search or filter." action={<Chip onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</Chip>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {shown.map((f) => (
            <li key={f.slug}>
              <ArtFormCard form={f} />
            </li>
          ))}
          <li className="flex">
            <div className="flex w-full flex-col items-start justify-center rounded-card bg-forest p-6 text-white">
              <h2 className="text-xl font-semibold">Have a painting to evaluate?</h2>
              <p className="mt-2 text-white/85">Upload it and see which style it resembles. This is a similarity estimate, not a quality score.</p>
              <LinkButton to="/analyse" className="mt-4">
                Upload Your Artwork
              </LinkButton>
            </div>
          </li>
        </ul>
      )}
    </div>
  )
}
