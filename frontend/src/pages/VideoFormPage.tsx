import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, LinkButton, ProgressBar, Skeleton } from '../components/ui/basic'
import { FieldError, RequireLogin, inputClass } from '../components/ui/extras'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import { jsonInit, uploadForm } from '../lib/upload'
import { ART_FORM_OPTIONS, LEVELS, type VideoItem } from '../typesCraft'

const MAX_VIDEO_MB = 50
// Same rules and wording as backend/videos.py
const VIDEO_MESSAGES = {
  type: 'Unsupported video. Please upload an MP4 or WebM file.',
  tooLarge: `This video is larger than ${MAX_VIDEO_MB} MB. Please upload a smaller file or paste a YouTube link instead.`,
  empty: 'This video file is empty.',
}

function checkVideoFile(f: File): string | null {
  if (f.size === 0) return VIDEO_MESSAGES.empty
  if (!/\.(mp4|webm)$/i.test(f.name) || !['video/mp4', 'video/webm'].includes(f.type)) return VIDEO_MESSAGES.type
  if (f.size > MAX_VIDEO_MB * 1024 * 1024) return VIDEO_MESSAGES.tooLarge
  return null
}

function Form({ existing }: { existing?: VideoItem }) {
  const nav = useNavigate()
  const editing = !!existing
  const [method, setMethod] = useState<'youtube' | 'upload'>(existing?.kind === 'upload' ? 'upload' : 'youtube')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [artForm, setArtForm] = useState(existing?.art_form ?? '')
  const [level, setLevel] = useState<string>(existing?.level ?? '')
  const [youtube, setYoutube] = useState(existing?.youtube_id ? `https://www.youtube.com/watch?v=${existing.youtube_id}` : '')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (title.trim().length < 3) return setError('Please enter a title of at least 3 characters.')
    if (!artForm) return setError('Please choose an art form.')
    if (!level) return setError('Please choose a level.')
    const kind = editing ? existing!.kind : method
    if (!editing && kind === 'youtube' && !youtube.trim()) return setError('Please paste a YouTube link.')
    if (!editing && kind === 'upload' && !file) return setError('Please choose a video file.')
    setBusy(true)
    try {
      let saved: VideoItem
      if (editing) {
        saved = await apiFetch<VideoItem>(`/api/videos/${existing!.id}`, jsonInit('PUT', { title, description, art_form: artForm, level, youtube_url: kind === 'youtube' ? youtube : '' }))
      } else if (kind === 'youtube') {
        saved = await apiFetch<VideoItem>('/api/videos', jsonInit('POST', { title, description, art_form: artForm, level, youtube_url: youtube }))
      } else {
        const form = new FormData()
        form.append('file', file!, file!.name)
        form.append('title', title)
        form.append('description', description)
        form.append('art_form', artForm)
        form.append('level', level)
        setProgress(0)
        saved = await uploadForm<VideoItem>('/api/videos/upload', form, { onProgress: setProgress })
      }
      nav(`/teachers/${saved.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the video.')
      setProgress(null)
      setBusy(false)
    }
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-3xl font-semibold">{editing ? 'Edit video' : 'Add a video'}</h1>
      <Card className="mt-5 p-5">
        <form onSubmit={submit} noValidate className="space-y-4">
          {!editing && (
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">How do you want to add it?</legend>
              <div className="flex flex-wrap gap-3">
                {([['youtube', 'Paste a YouTube link'], ['upload', `Upload MP4 or WebM (max ${MAX_VIDEO_MB} MB)`]] as const).map(([v, l]) => (
                  <label key={v} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border px-3 ${method === v ? 'border-forest bg-forest/10' : 'border-parchment-400'}`}>
                    <input type="radio" name="method" checked={method === v} onChange={() => setMethod(v)} /> {l}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {(editing ? existing!.kind === 'youtube' : method === 'youtube') ? (
            <div>
              <label htmlFor="yt" className="mb-1 block text-sm font-semibold">YouTube link</label>
              <input id="yt" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className={inputClass} />
              <p className="mt-1 text-xs text-muted">Only post videos you made or have permission to share.</p>
            </div>
          ) : !editing ? (
            <div>
              <label htmlFor="file" className="mb-1 block text-sm font-semibold">Video file</label>
              <input id="file" type="file" accept="video/mp4,video/webm" onChange={(e) => { const f = e.target.files?.[0] ?? null; const msg = f ? checkVideoFile(f) : null; setFileError(msg); setFile(msg ? null : f) }} className="block w-full text-sm" />
              <FieldError id="file-err" text={fileError} />
            </div>
          ) : null}
          <div>
            <label htmlFor="v-title" className="mb-1 block text-sm font-semibold">Title</label>
            <input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} dir="auto" className={inputClass} />
          </div>
          <div>
            <label htmlFor="v-desc" className="mb-1 block text-sm font-semibold">Description</label>
            <textarea id="v-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} dir="auto" className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="v-art" className="mb-1 block text-sm font-semibold">Art form</label>
              <select id="v-art" value={artForm} onChange={(e) => setArtForm(e.target.value)} className={inputClass}>
                <option value="">Choose...</option>
                {ART_FORM_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="v-level" className="mb-1 block text-sm font-semibold">Level</label>
              <select id="v-level" value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass}>
                <option value="">Choose...</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {progress !== null && <ProgressBar value={progress * 100} label="Upload progress" />}
          <FieldError id="v-error" text={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? (progress !== null ? `Uploading ${Math.round(progress * 100)}%` : 'Saving...') : editing ? 'Save changes' : 'Publish video'}</Button>
            <Link to={editing ? `/teachers/${existing!.id}` : '/teachers'} className="inline-flex min-h-[44px] items-center px-4 text-sm font-semibold">Cancel</Link>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Gate({ id }: { id?: string }) {
  const { user } = useAuth()
  const { data, error, loading, reload } = useApi<{ video: VideoItem }>(id ? `/api/videos/${id}` : null)
  if (user && user.role !== 'craftsperson') {
    return <div className="container-page py-12"><EmptyState title="Craftsperson accounts only" text="Only craftsperson accounts can add or edit videos. You can sign up again as a Craftsperson with another username." action={<LinkButton to="/teachers" variant="outline">Back to videos</LinkButton>} /></div>
  }
  if (id) {
    if (loading) return <div className="container-page py-8"><Skeleton className="h-64" /></div>
    if (error) return <div className="container-page py-12"><ErrorState message={error.message} onRetry={reload} /></div>
    if (data && data.video.teacher.id !== user?.id) return <div className="container-page py-12"><EmptyState title="Not your video" text="You can only edit your own videos." action={<LinkButton to="/teachers">Back to videos</LinkButton>} /></div>
    return <Form existing={data!.video} />
  }
  return <Form />
}

export default function VideoFormPage() {
  const { id } = useParams()
  usePageTitle(id ? 'Edit video' : 'Add a video')
  return <RequireLogin what="add or edit videos"><Gate id={id} /></RequireLogin>
}
