import { useMemo, useState } from 'react'
import { Chip, Card, ErrorState, SectionHeader, Skeleton } from '../components/ui/basic'
import { useApi, usePageTitle } from '../lib/hooks'
import type { CreditRow } from '../types'

export default function CreditsPage() {
  usePageTitle('Credits')
  const { data, error, loading, reload } = useApi<{ credits: CreditRow[]; note: string }>('/api/credits')
  const [art, setArt] = useState('all')
  const arts = useMemo(() => ['all', ...Array.from(new Set((data?.credits ?? []).map((c) => c.art)))], [data])
  const rows = (data?.credits ?? []).filter((c) => art === 'all' || c.art === art)

  return (
    <div className="container-page max-w-4xl py-8">
      <SectionHeader as="h1" title="Credits" subtitle="Where the images, data and software on this prototype come from." />

      <Card className="mb-6 p-5">
        <h2 className="text-xl font-semibold">Illustrations are AI-generated</h2>
        <p className="mt-2">Illustrations on this prototype are AI-generated and are not photographs of real artworks or artists. They were supplied by the team and are used for layout and reference only. They do not represent any real artist&rsquo;s work.</p>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="text-xl font-semibold">Content review</h2>
        <p className="mt-2">Descriptions, tips and exercises are curated by the team and have not yet been reviewed by traditional artists or experts. Please treat them as learning notes, not as authoritative guidance.</p>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="text-xl font-semibold">Model and software</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>CLIP ViT-B/32 by OpenAI (MIT licence), loaded through Hugging Face Transformers.</li>
          <li>scikit-learn (BSD) for the logistic regression classifier; PyTorch (BSD).</li>
          <li>FastAPI, React, Vite and Tailwind CSS (MIT); fonts Playfair Display and Plus Jakarta Sans (SIL OFL).</li>
        </ul>
      </Card>

      <h2 className="mb-2 text-xl font-semibold">Wikimedia Commons training images</h2>
      <p className="mb-4 text-muted">
        {data?.note ?? 'The classifier was trained on images from Wikimedia Commons. Each entry lists its author and licence; attribution is required for CC BY and CC BY-SA.'}
      </p>
      <div role="group" aria-label="Filter by art form" className="mb-4 flex flex-wrap gap-2">
        {arts.map((a) => (
          <Chip key={a} active={art === a} onClick={() => setArt(a)} className="capitalize">{a}</Chip>
        ))}
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-parchment-300">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Image credits</caption>
            <thead className="bg-parchment-200">
              <tr>
                <th scope="col" className="p-3">File</th>
                <th scope="col" className="p-3">Author</th>
                <th scope="col" className="p-3">Licence</th>
                <th scope="col" className="p-3 capitalize">Art form</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.source_url + r.title} className="border-t border-parchment-300">
                  <td className="p-3"><a className="text-terracotta-text underline" href={r.source_url} target="_blank" rel="noopener noreferrer">{r.title}</a></td>
                  <td className="p-3">{r.author || 'Unknown'}</td>
                  <td className="p-3">{r.license}</td>
                  <td className="p-3 capitalize">{r.art}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
