import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { VideoCard } from '../components/VideoCard'
import { Chip, EmptyState, ErrorState, LinkButton, SectionHeader, Skeleton } from '../components/ui/basic'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import { ART_FORM_OPTIONS, type VideoItem } from '../typesCraft'

export default function TeachersPage() {
  usePageTitle('Learn from craftspeople')
  const { user } = useAuth()
  const [art, setArt] = useState('')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])
  const params = new URLSearchParams()
  if (art) params.set('art_form', art)
  if (debounced) params.set('q', debounced)
  const { data, error, loading, reload } = useApi<{ videos: VideoItem[]; total: number }>(`/api/videos?${params}`)
  const craft = user?.role === 'craftsperson'

  return (
    <div className="container-page py-8">
      <SectionHeader
        as="h1"
        title="Learn from craftspeople"
        subtitle="Video lessons from craftspeople. Profiles are not verified in this demo, and items marked Demo data are placeholders."
        action={craft ? <LinkButton to="/teachers/new"><Plus className="h-4 w-4" aria-hidden="true" /> Add a video</LinkButton> : undefined}
      />
      <div className="relative mb-4 max-w-2xl">
        <label htmlFor="video-search" className="sr-only">Search videos</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id="video-search" type="search" value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))} placeholder="Search videos or teachers" className="min-h-[48px] w-full rounded-full border border-parchment-400 bg-parchment-50 pl-12 pr-4" />
      </div>
      <div role="group" aria-label="Filter by art form" className="mb-6 flex flex-wrap gap-2">
        <Chip active={art === ''} onClick={() => setArt('')}>All</Chip>
        {ART_FORM_OPTIONS.map(([v, l]) => <Chip key={v} active={art === v} onClick={() => setArt(v)}>{l}</Chip>)}
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : data && data.videos.length === 0 ? (
        <EmptyState title="No videos found" text={art || debounced ? 'Try another art form or search.' : 'No videos have been added yet. Craftspeople can add one after logging in.'} action={craft ? <LinkButton to="/teachers/new">Add a video</LinkButton> : undefined} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {data?.videos.map((v) => <li key={v.id}><VideoCard v={v} /></li>)}
        </ul>
      )}
    </div>
  )
}
