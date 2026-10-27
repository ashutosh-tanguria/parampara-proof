import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MediaImage } from '../components/ListingCard'
import { Button, Card, EmptyState, ErrorState, LinkButton, ProgressBar, Skeleton } from '../components/ui/basic'
import { FieldError, RequireLogin, inputClass } from '../components/ui/extras'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApi, usePageTitle } from '../lib/hooks'
import { jsonInit, uploadForm } from '../lib/upload'
import { ART_FORM_OPTIONS, type ListingItem } from '../typesCraft'

const MAX_IMAGES = 4
const MAX_IMAGE_MB = 5
// Same rules and wording as backend/uploads.py (images are also checked by content on the server)
const IMAGE_MESSAGES = {
  type: 'Unsupported file type. Please upload a JPG, PNG or WEBP image.',
  tooLarge: `This image is larger than ${MAX_IMAGE_MB} MB. Please choose a smaller file.`,
  empty: 'This file is empty.',
}

function checkImage(f: File): string | null {
  if (f.size === 0) return IMAGE_MESSAGES.empty
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return IMAGE_MESSAGES.type
  if (f.size > MAX_IMAGE_MB * 1024 * 1024) return IMAGE_MESSAGES.tooLarge
  return null
}

function Form({ existing }: { existing?: ListingItem }) {
  const nav = useNavigate()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [artForm, setArtForm] = useState(existing?.art_form ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price_inr) : '')
  const [size, setSize] = useState(existing?.size ?? '')
  const [materials, setMaterials] = useState(existing?.materials ?? '')
  const [images, setImages] = useState<string[]>(existing?.images ?? [])
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const slots = MAX_IMAGES - images.length

  const pick = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (picked.length > slots) return setFileError(`A listing can have at most ${MAX_IMAGES} images. You can add ${slots} more.`)
    const bad = picked.map(checkImage).find(Boolean)
    setFileError(bad ?? null)
    setFiles(bad ? [] : picked)
  }

  const removeImage = async (index: number) => {
    if (!existing) return
    try {
      await apiFetch(`/api/listings/${existing.id}/images/${index}`, { method: 'DELETE' })
      setImages((im) => im.filter((_, i) => i !== index))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove the image.')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    const rupees = Number(price)
    if (title.trim().length < 3) return setError('Please enter a title of at least 3 characters.')
    if (!artForm) return setError('Please choose an art form.')
    if (!Number.isInteger(rupees) || rupees < 1) return setError('Please enter an indicative price in whole rupees.')
    setBusy(true)
    try {
      const body = { title, description, art_form: artForm, price_inr: rupees, size, materials }
      const saved = existing
        ? await apiFetch<ListingItem>(`/api/listings/${existing.id}`, jsonInit('PUT', body))
        : await apiFetch<ListingItem>('/api/listings', jsonInit('POST', body))
      if (files.length) {
        const form = new FormData()
        files.forEach((f) => form.append('files', f, f.name))
        setProgress(0)
        try {
          await uploadForm(`/api/listings/${saved.id}/images`, form, { onProgress: setProgress })
        } catch (err) {
          // The listing exists already; take the user to its edit page to retry the pictures.
          nav(`/marketplace/${saved.id}/edit`, { replace: true })
          throw err
        }
      }
      nav(`/marketplace/${saved.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the listing.')
      setProgress(null)
      setBusy(false)
    }
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-3xl font-semibold">{existing ? 'Edit listing' : 'Add a listing'}</h1>
      <p className="mt-1 text-muted">Listings are for enquiries only. There is no checkout, and the price is an indicative price.</p>
      <Card className="mt-5 p-5">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="l-title" className="mb-1 block text-sm font-semibold">Title</label>
            <input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} dir="auto" className={inputClass} />
          </div>
          <div>
            <label htmlFor="l-desc" className="mb-1 block text-sm font-semibold">Description</label>
            <textarea id="l-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} dir="auto" className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="l-art" className="mb-1 block text-sm font-semibold">Art form</label>
              <select id="l-art" value={artForm} onChange={(e) => setArtForm(e.target.value)} className={inputClass}>
                <option value="">Choose...</option>
                {ART_FORM_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="l-price" className="mb-1 block text-sm font-semibold">Indicative price (INR)</label>
              <input id="l-price" type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="l-size" className="mb-1 block text-sm font-semibold">Size</label>
              <input id="l-size" value={size} onChange={(e) => setSize(e.target.value)} maxLength={60} className={inputClass} />
            </div>
            <div>
              <label htmlFor="l-materials" className="mb-1 block text-sm font-semibold">Materials</label>
              <input id="l-materials" value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={120} className={inputClass} />
            </div>
          </div>
          {images.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold">Current pictures</p>
              <ul className="flex flex-wrap gap-3">
                {images.map((src, i) => (
                  <li key={src} className="w-24">
                    <MediaImage src={src} alt={`Picture ${i + 1}`} className="aspect-[4/3] w-full overflow-hidden rounded-control" />
                    {existing && <button type="button" onClick={() => removeImage(i)} className="mt-1 min-h-[44px] w-full text-xs font-semibold text-terracotta-dark">Remove</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {slots > 0 && (
            <div>
              <label htmlFor="l-images" className="mb-1 block text-sm font-semibold">Add pictures (up to {slots} more; JPG, PNG or WebP, max {MAX_IMAGE_MB} MB each)</label>
              <input id="l-images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files)} className="block w-full text-sm" />
              <FieldError id="l-img-err" text={fileError} />
            </div>
          )}
          {progress !== null && <ProgressBar value={progress * 100} label="Upload progress" />}
          <FieldError id="l-error" text={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : existing ? 'Save changes' : 'Publish listing'}</Button>
            <Link to={existing ? `/marketplace/${existing.id}` : '/marketplace'} className="inline-flex min-h-[44px] items-center px-4 text-sm font-semibold">Cancel</Link>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Gate({ id }: { id?: string }) {
  const { user } = useAuth()
  const { data, error, loading, reload } = useApi<{ listing: ListingItem }>(id ? `/api/listings/${id}` : null)
  if (user && user.role !== 'craftsperson') {
    return <div className="container-page py-12"><EmptyState title="Craftsperson accounts only" text="Only craftsperson accounts can add or edit listings." action={<LinkButton to="/marketplace" variant="outline">Back to the marketplace</LinkButton>} /></div>
  }
  if (id) {
    if (loading) return <div className="container-page py-8"><Skeleton className="h-64" /></div>
    if (error) return <div className="container-page py-12"><ErrorState message={error.message} onRetry={reload} /></div>
    if (data && data.listing.craftsperson.id !== user?.id) return <div className="container-page py-12"><EmptyState title="Not your listing" text="You can only edit your own listings." action={<LinkButton to="/marketplace">Back</LinkButton>} /></div>
    return <Form existing={data!.listing} />
  }
  return <Form />
}

export default function ListingFormPage() {
  const { id } = useParams()
  usePageTitle(id ? 'Edit listing' : 'Add a listing')
  return <RequireLogin what="add or edit listings"><Gate id={id} /></RequireLogin>
}
