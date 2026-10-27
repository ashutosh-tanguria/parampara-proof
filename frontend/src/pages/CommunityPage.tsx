import { useState, type FormEvent } from 'react'
import { Heart, Plus } from 'lucide-react'
import { Badge, Button, Card, Chip, EmptyState, ErrorState, SectionHeader, Skeleton } from '../components/ui/basic'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { useArtForms } from '../lib/artForms'
import { apiFetch, ApiError } from '../lib/api'
import { useApi, usePageTitle } from '../lib/hooks'
import { KEYS, readJSON, writeJSON } from '../lib/storage'
import type { CommunityPost, HistoryEntry } from '../types'

export default function CommunityPage() {
  usePageTitle('Community')
  const { data, error, loading, reload } = useApi<{ artworks: CommunityPost[] }>('/api/community')
  const { forms } = useArtForms()
  const [edited, setEdited] = useState<CommunityPost[] | null>(null)
  const posts = edited ?? data?.artworks ?? []
  const setPosts = (fn: (ps: CommunityPost[]) => CommunityPost[]) => setEdited((cur) => fn(cur ?? data?.artworks ?? []))
  const [filter, setFilter] = useState('all')
  const [liked, setLiked] = useState<string[]>(() => readJSON<string[]>(KEYS.liked, []))
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const toggleLike = async (p: CommunityPost) => {
    const wasLiked = liked.includes(p.id)
    const delta = wasLiked ? -1 : 1
    const nextLiked = wasLiked ? liked.filter((x) => x !== p.id) : [...liked, p.id]
    // optimistic update
    setLiked(nextLiked)
    setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, likes: x.likes + delta } : x)))
    try {
      const r = await apiFetch<{ likes: number }>(`/api/community/${encodeURIComponent(p.id)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !wasLiked }),
      })
      setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, likes: r.likes } : x)))
      writeJSON(KEYS.liked, nextLiked)
    } catch {
      // rollback
      setLiked(liked)
      setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, likes: x.likes - delta } : x)))
      toast('Could not save your like. Please try again.')
    }
  }

  const shown = posts.filter((p) => filter === 'all' || p.art_form === filter)

  return (
    <div className="container-page py-8">
      <SectionHeader
        as="h1"
        title="Community"
        subtitle="Posts marked Sample are placeholders for this prototype, not real members."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Share your artwork
          </Button>
        }
      />
      <div role="group" aria-label="Filter by art form" className="mb-6 flex flex-wrap gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        {forms.map((f) => (
          <Chip key={f.slug} active={filter === f.slug} onClick={() => setFilter(f.slug)}>{f.name}</Chip>
        ))}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState title="No posts here yet" text="Be the first to share something in this art form." action={<Button onClick={() => setOpen(true)}>Share your artwork</Button>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const isLiked = liked.includes(p.id)
            return (
              <li key={p.id}>
                <Card className="overflow-hidden">
                  {p.image_slug ? (
                    <ResponsiveImage slug={p.image_slug} ratio="4 / 3" sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw" />
                  ) : p.image_url ? (
                    <img src={p.image_url} alt={`Artwork: ${p.title}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <ResponsiveImage slug={null} ratio="4 / 3" fallbackLabel="No image" />
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={p.is_sample ? 'ochre' : 'forest'}>{p.is_sample ? 'Sample' : 'Shared by you'}</Badge>
                      <Badge tone="neutral" className="capitalize">{p.art_form}</Badge>
                    </div>
                    <h2 className="font-semibold" dir="auto">{p.title}</h2>
                    <p className="text-sm text-muted">{p.artist} &middot; {p.created_at}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <button type="button" onClick={() => toggleLike(p)} aria-pressed={isLiked} aria-label={`${isLiked ? 'Unlike' : 'Like'} this post, ${p.likes} likes`} className="flex min-h-[44px] items-center gap-1.5 rounded-control px-2 hover:bg-parchment-300/60">
                        <Heart className={`h-5 w-5 ${isLiked ? 'fill-terracotta text-terracotta' : ''}`} aria-hidden="true" /> {p.likes}
                      </button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <ShareModal open={open} onClose={() => setOpen(false)} onCreated={(p) => { setPosts((ps) => [p, ...ps]); setOpen(false); toast('Your post was added.') }} />
    </div>
  )
}

function ShareModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: CommunityPost) => void }) {
  const { forms } = useArtForms()
  const [title, setTitle] = useState('')
  const [artForm, setArtForm] = useState('')
  const [analysisId, setAnalysisId] = useState('')
  const [errors, setErrors] = useState<{ title?: string; art?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const history = readJSON<HistoryEntry[]>(KEYS.history, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    const t = title.trim()
    if (t.length < 3) errs.title = 'Please enter a title of at least 3 characters.'
    if (t.length > 80) errs.title = 'Please keep the title under 80 characters.'
    if (!artForm) errs.art = 'Please choose an art form.'
    setErrors(errs)
    if (Object.keys(errs).length || busy) return
    setBusy(true)
    try {
      const p = await apiFetch<CommunityPost>('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, art_form: artForm, analysis_id: analysisId || null }),
      })
      setTitle('')
      setArtForm('')
      setAnalysisId('')
      onCreated(p)
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not share your artwork.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share your artwork">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="post-title" className="mb-1 block text-sm font-semibold">Title</label>
          <input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-err' : undefined} className="min-h-[44px] w-full rounded-control border border-parchment-400 bg-parchment-50 px-3" />
          {errors.title && <p id="title-err" role="alert" className="mt-1 text-sm text-terracotta-dark">{errors.title}</p>}
        </div>
        <div>
          <label htmlFor="post-art" className="mb-1 block text-sm font-semibold">Art form</label>
          <select id="post-art" value={artForm} onChange={(e) => setArtForm(e.target.value)} aria-invalid={!!errors.art} className="min-h-[44px] w-full rounded-control border border-parchment-400 bg-parchment-50 px-3">
            <option value="">Choose...</option>
            {forms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          {errors.art && <p role="alert" className="mt-1 text-sm text-terracotta-dark">{errors.art}</p>}
        </div>
        <div>
          <label htmlFor="post-analysis" className="mb-1 block text-sm font-semibold">Attach one of your analysed images (optional)</label>
          <select id="post-analysis" value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} className="min-h-[44px] w-full rounded-control border border-parchment-400 bg-parchment-50 px-3">
            <option value="">No image</option>
            {history.map((h) => <option key={h.id} value={h.id}>{h.target_name} - {new Date(h.created_at).toLocaleDateString()}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Images are deleted from the server after 24 hours.</p>
        </div>
        {errors.form && <p role="alert" className="text-sm text-terracotta-dark">{errors.form}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Sharing...' : 'Share'}</Button>
        </div>
      </form>
    </Modal>
  )
}
