import { useState } from 'react'
import { Clock } from 'lucide-react'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { Badge, Card, ErrorState, SectionHeader, Skeleton } from '../components/ui/basic'
import { Tabs } from '../components/ui/Tabs'
import { useApi, usePageTitle } from '../lib/hooks'
import type { LessonsPayload } from '../types'

export default function LearnPage() {
  usePageTitle('Learn and Improve')
  const { data, error, loading, reload } = useApi<LessonsPayload>('/api/lessons')
  const [tab, setTab] = useState('lessons')

  const body = () => {
    if (error) return <ErrorState message={error.message} onRetry={reload} />
    if (loading || !data) return <Skeleton className="h-72" />
    const tabs = [
      {
        id: 'lessons',
        label: 'Video Lessons',
        content: (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative overflow-hidden rounded-card shadow-warm">
              <ResponsiveImage slug="painting-together" ratio="16 / 9" sizes="(min-width: 1024px) 700px, 92vw" imgClassName="brightness-[.55]" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                <Badge tone="ochre" className="mb-2 w-fit">Coming soon</Badge>
                <h3 className="text-2xl font-semibold">Video lessons are in development</h3>
                <p className="mt-1 max-w-md text-sm text-white/90">The outlines on this page show what each lesson will cover. There are no videos yet.</p>
              </div>
            </div>
            <ul className="space-y-3">
              {data.lessons.map((l) => (
                <li key={l.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{l.title}</h3>
                      <Badge tone="neutral"><Clock className="h-3 w-3" aria-hidden="true" /> Coming soon</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">Lesson outline &middot; <span className="capitalize">{l.art_form}</span></p>
                    <p className="mt-1 text-sm">{l.summary}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ),
      },
      {
        id: 'mistakes',
        label: 'Common Mistakes',
        content: (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.common_mistakes.map((m) => (
              <li key={m.art_form + m.mistake}>
                <Card className="h-full p-5">
                  <Badge tone="terracotta">{m.art_form}</Badge>
                  <p className="mt-2 font-semibold">{m.mistake}</p>
                  <p className="mt-1 text-muted">Fix: {m.fix}</p>
                </Card>
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: 'exercises',
        label: 'Practice Exercises',
        content: (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.practice_exercises.map((e) => (
              <li key={e.id}>
                <Card className="h-full p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="terracotta">{e.art_form}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{e.title}</p>
                  <p className="mt-1 text-muted">{e.steps}</p>
                </Card>
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: 'tips',
        label: 'Tips',
        content: (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.tips.map((t) => (
              <li key={t.art_form + t.tip}>
                <Card className="h-full p-5">
                  <Badge tone="forest">{t.art_form}</Badge>
                  <p className="mt-2">{t.tip}</p>
                </Card>
              </li>
            ))}
          </ul>
        ),
      },
    ]
    return <Tabs items={tabs} value={tab} onChange={setTab} label="Learning sections" />
  }

  return (
    <div className="container-page py-8">
      <SectionHeader as="h1" title="Learn & Improve" subtitle="Practice material to help you with each style. Notes are curated by the team and not yet reviewed by practising artists." />
      {body()}
    </div>
  )
}
