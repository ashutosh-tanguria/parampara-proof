import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Check } from 'lucide-react'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { StyleBadge } from '../components/ArtFormCard'
import { Badge, Button, Card, EmptyState, ErrorState, LinkButton, Skeleton } from '../components/ui/basic'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { useApi, usePageTitle, useStoredList } from '../lib/hooks'
import { KEYS } from '../lib/storage'
import type { ArtFormDetail } from '../types'

function Missing({ what }: { what: string }) {
  return <p className="text-muted">No {what} have been added for this art form yet.</p>
}

export default function ArtFormDetailPage() {
  const { slug = '' } = useParams()
  const { data, error, loading, reload } = useApi<ArtFormDetail>(`/api/art-forms/${encodeURIComponent(slug)}`)
  const [tab, setTab] = useState('overview')
  const [saved, save, unsave, persisted] = useStoredList<string>(KEYS.saved)
  const toast = useToast()
  usePageTitle(data?.name ?? 'Art form')

  if (loading) {
    return (
      <div className="container-page py-8">
        <Skeleton className="mb-4 h-10 w-1/2" />
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (error?.status === 404) {
    return (
      <div className="container-page py-12">
        <EmptyState title="We could not find that art form" text="It may have been renamed or removed." action={<LinkButton to="/art-forms">See all art forms</LinkButton>} />
      </div>
    )
  }
  if (error || !data) return <div className="container-page py-12"><ErrorState message={error?.message ?? 'Could not load this art form.'} onRetry={reload} /></div>

  const isSaved = saved.includes(data.slug)
  const toggleSave = () => {
    if (isSaved) unsave((s) => s === data.slug)
    else save(data.slug)
    if (!persisted) toast('Your browser did not allow saving. This will be lost when you close the tab.')
  }

  const chars = data.key_characteristics ?? []
  const analyseLink = `/analyse?art_form=${data.slug}`

  const overview = (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <ResponsiveImage slug={data.image_slug} ratio="4 / 3" sizes="(min-width: 1024px) 640px, 92vw" className="rounded-card shadow-warm" fallbackLabel="Reference image coming soon" />
        {data.overview && <p className="mt-4 text-lg">{data.overview}</p>}
      </div>
      <div>
        <Card className="p-5">
          <h3 className="mb-3 text-xl font-semibold">Key characteristics</h3>
          {chars.length === 0 ? (
            <Missing what="characteristics" />
          ) : (
            <ul className="space-y-4">
              {chars.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted">{c.description}</p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold text-terracotta-text">Tip: </span>
                      {c.tip}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <>
          {overview}
          {data.quote && (
            <blockquote className="mt-8 rounded-card bg-ochre-50 p-5 font-serif text-lg italic">
              {data.quote}
              <footer className="mt-2 text-sm not-italic text-muted">Quote from the team&rsquo;s curated notes, not a verified citation.</footer>
            </blockquote>
          )}
        </>
      ),
    },
    {
      id: 'history',
      label: 'History',
      content: data.origin ? (
        <div className="max-w-3xl">
          <h3 className="text-xl font-semibold">Origin</h3>
          <p className="mt-2 text-lg">{data.origin}</p>
          <p className="mt-4 text-sm text-muted">Notes are curated by the team and have not yet been reviewed by practising artists.</p>
        </div>
      ) : (
        <Missing what="history notes" />
      ),
    },
    {
      id: 'techniques',
      label: 'Techniques',
      content: data.materials_and_techniques?.length ? (
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-lg">
          {data.materials_and_techniques.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <Missing what="technique notes" />
      ),
    },
    {
      id: 'mistakes',
      label: 'Common Mistakes',
      content: data.common_mistakes?.length ? (
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-lg">
          {data.common_mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <Missing what="common mistakes" />
      ),
    },
    {
      id: 'gallery',
      label: 'Gallery',
      content: data.gallery?.length ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.gallery.map((g) => (
              <li key={g.image_slug}>
                <Card className="overflow-hidden">
                  <ResponsiveImage slug={g.image_slug} ratio="16 / 10" sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw" />
                  <p className="p-3 text-sm font-medium">{g.title}</p>
                </Card>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            These are AI-generated illustrations, not photographs of real artworks. See <Link className="underline" to="/credits">Credits</Link>.
          </p>
        </>
      ) : (
        <EmptyState title="Gallery coming soon" text="No reference images are available for this art form yet." />
      ),
    },
    {
      id: 'learn',
      label: 'Learn',
      content: (
        <div className="max-w-3xl space-y-4">
          <h3 className="text-xl font-semibold">Next practice exercise</h3>
          <p className="text-lg">{data.next_exercise || 'Practise basic outlines and border patterns of this style.'}</p>
          <LinkButton to="/learn" variant="outline">See all practice material</LinkButton>
        </div>
      ),
    },
  ]

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
        <Link to="/art-forms" className="hover:underline">Art Forms</Link> <span aria-hidden="true">/</span> <span aria-current="page">{data.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{data.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StyleBadge automated={data.automated_supported} />
            {!data.automated_supported && <Badge tone="neutral">Guidance only, no automated analysis</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={toggleSave} aria-pressed={isSaved}>
            {isSaved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          <LinkButton to={analyseLink}>Analyse my artwork</LinkButton>
        </div>
      </div>
      <Tabs items={tabs} value={tab} onChange={setTab} label={`${data.name} sections`} />
    </div>
  )
}
