import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Play, Trash2 } from 'lucide-react'
import { MessageButton } from '../components/MessageButton'
import { PatternBlock } from '../components/ResponsiveImage'
import { VideoCard, kindLabel } from '../components/VideoCard'
import { Badge, Button, Card, EmptyState, ErrorState, LinkButton, Skeleton } from '../components/ui/basic'
import { DemoBadge } from '../components/ui/extras'
import { useToast } from '../components/ui/Toast'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import type { Person, VideoItem } from '../typesCraft'

function Player({ v }: { v: VideoItem }) {
  const [loaded, setLoaded] = useState(false)
  if (v.kind === 'upload' && v.file_url) {
    return <video controls preload="metadata" className="aspect-video w-full rounded-card bg-black" src={v.file_url} aria-label={v.title} />
  }
  if (v.kind === 'youtube' && v.youtube_id) {
    return loaded ? (
      <iframe
        className="aspect-video w-full rounded-card"
        src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1`}
        title={v.title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    ) : (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-card bg-forest p-4 text-center text-white">
        <p className="max-w-md text-sm text-white/85">This video is hosted on YouTube. It loads from YouTube only when you press play, and YouTube may set its own cookies.</p>
        <Button onClick={() => setLoaded(true)} variant="primary"><Play className="h-4 w-4" aria-hidden="true" /> Load video from YouTube</Button>
      </div>
    )
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-card">
      <PatternBlock label="Demo video, no real video attached" />
    </div>
  )
}

export default function VideoDetailPage() {
  const { id = '' } = useParams()
  const { data, error, loading, reload } = useApi<{ video: VideoItem; teacher: Person; related: VideoItem[] }>(`/api/videos/${encodeURIComponent(id)}`)
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState<string | null>(null)
  usePageTitle(data?.video.title ?? 'Video')

  if (loading && !data) return <div className="container-page py-8"><Skeleton className="mb-4 h-8 w-1/2" /><Skeleton className="aspect-video w-full" /></div>
  if (error?.status === 404) return <div className="container-page py-12"><EmptyState title="We could not find that video" text="It may have been deleted." action={<LinkButton to="/teachers">See all videos</LinkButton>} /></div>
  if (error || !data) return <div className="container-page py-12"><ErrorState message={error?.message ?? 'Could not load this video.'} onRetry={reload} /></div>

  const { video: v, teacher, related } = data
  const mine = user?.id === teacher.id

  const remove = async () => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return
    setDeleting(true)
    setDelError(null)
    try {
      await apiFetch(`/api/videos/${v.id}`, { method: 'DELETE' })
      toast('Video deleted.')
      nav('/teachers')
    } catch (e) {
      setDelError(e instanceof ApiError ? e.message : 'Could not delete the video.')
      setDeleting(false)
    }
  }

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link to="/teachers" className="hover:underline">Learn from craftspeople</Link> <span aria-hidden="true">/</span> <span aria-current="page">{v.title}</span>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Player v={v} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DemoBadge show={v.is_demo} />
            <Badge tone="neutral" className="capitalize">{v.art_form}</Badge>
            <Badge tone="forest">{v.level}</Badge>
            <span className="text-xs text-muted">{kindLabel(v)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl" dir="auto">{v.title}</h1>
          <p className="mt-3 whitespace-pre-line text-lg" dir="auto">{v.description || 'No description.'}</p>
          {mine && (
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton to={`/teachers/${v.id}/edit`} variant="outline"><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</LinkButton>
              <Button variant="outline" onClick={remove} disabled={deleting}><Trash2 className="h-4 w-4" aria-hidden="true" /> {deleting ? 'Deleting...' : 'Delete'}</Button>
              {delError && <p role="alert" className="w-full text-sm text-terracotta-dark">{delError}</p>}
            </div>
          )}
        </div>
        <aside aria-label="Teacher">
          <Card className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold"><Link to={`/craftspeople/${teacher.id}`} className="hover:underline">{teacher.display_name}</Link></h2>
              <DemoBadge show={teacher.is_demo} />
            </div>
            <p className="text-sm text-muted"><span className="capitalize">{teacher.art_form}</span>{teacher.region ? ` · ${teacher.region}` : ''}</p>
            {teacher.bio && <p className="mt-3" dir="auto">{teacher.bio}</p>}
            <p className="mt-3 rounded-control bg-ochre-50 p-2 text-xs">Profiles are not verified in this demo.</p>
            <div className="mt-4"><MessageButton toUserId={teacher.id} contextType="video" contextId={v.id} label="Message this teacher" /></div>
          </Card>
        </aside>
      </div>
      <section aria-labelledby="related" className="mt-10">
        <h2 id="related" className="mb-4 text-xl font-semibold">Related videos</h2>
        {related.length === 0 ? <p className="text-muted">No related videos yet.</p> : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <li key={r.id}><VideoCard v={r} /></li>)}</ul>
        )}
      </section>
    </div>
  )
}
