import { useParams } from 'react-router-dom'
import { User } from 'lucide-react'
import { ListingCard } from '../components/ListingCard'
import { MessageButton } from '../components/MessageButton'
import { VideoCard } from '../components/VideoCard'
import { Card, EmptyState, ErrorState, LinkButton, Skeleton } from '../components/ui/basic'
import { DemoBadge } from '../components/ui/extras'
import { useApi, usePageTitle } from '../lib/hooks'
import type { ListingItem, Person, VideoItem } from '../typesCraft'

export default function CraftspersonPage() {
  const { id = '' } = useParams()
  const { data, error, loading, reload } = useApi<{ craftsperson: Person; videos: VideoItem[]; listings: ListingItem[] }>(`/api/craftspeople/${encodeURIComponent(id)}`)
  usePageTitle(data?.craftsperson.display_name ?? 'Craftsperson')

  if (loading && !data) return <div className="container-page py-8"><Skeleton className="h-40" /></div>
  if (error?.status === 404) return <div className="container-page py-12"><EmptyState title="We could not find that craftsperson" action={<LinkButton to="/teachers">See videos</LinkButton>} /></div>
  if (error || !data) return <div className="container-page py-12"><ErrorState message={error?.message ?? 'Could not load this profile.'} onRetry={reload} /></div>
  const c = data.craftsperson

  return (
    <div className="container-page py-8">
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-white"><User className="h-8 w-8" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold" dir="auto">{c.display_name}</h1>
              <DemoBadge show={c.is_demo} />
            </div>
            <p className="text-muted"><span className="capitalize">{c.art_form}</span>{c.region ? ` · ${c.region}` : ''}</p>
            {c.bio && <p className="mt-2" dir="auto">{c.bio}</p>}
            <p className="mt-3 rounded-control bg-ochre-50 p-2 text-sm">Profiles are not verified in this demo.</p>
          </div>
          <MessageButton toUserId={c.id} contextType="teacher" label="Message this craftsperson" />
        </div>
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-semibold">Videos</h2>
      {data.videos.length === 0 ? <p className="text-muted">No videos yet.</p> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.videos.map((v) => <li key={v.id}><VideoCard v={v} /></li>)}</ul>}
      <h2 className="mb-3 mt-8 text-xl font-semibold">Listings</h2>
      {data.listings.length === 0 ? <p className="text-muted">No listings yet.</p> : <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.listings.map((l) => <li key={l.id}><ListingCard l={l} /></li>)}</ul>}
    </div>
  )
}
