import { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import type { AnalysisReport, FeatureStatus } from '../types'
import { Badge, Card, LinkButton } from './ui/basic'
import { ResponsiveImage } from './ResponsiveImage'
import { cn } from '../lib/cn'

export const LOW_CONFIDENCE = 0.5

const STATUS_LABEL: Record<FeatureStatus, string> = {
  present: 'Present',
  weak: 'Weak',
  unsure: 'Unable to assess',
  manual_review: 'Review yourself',
}
const STATUS_TONE: Record<FeatureStatus, 'forest' | 'warning' | 'neutral' | 'ochre'> = {
  present: 'forest',
  weak: 'warning',
  unsure: 'neutral',
  manual_review: 'ochre',
}

export function StyleGauge({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`${label}: ${pct} percent`}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#EADFCF" strokeWidth="12" />
        <circle cx="64" cy="64" r={r} fill="none" stroke="#C44D34" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-serif text-3xl font-semibold">{pct}%</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  )
}

export function ProbabilityBars({ probabilities, target }: { probabilities: Record<string, number>; target: string }) {
  const rows = Object.entries(probabilities).sort((a, b) => b[1] - a[1])
  return (
    <ul className="space-y-3">
      {rows.map(([name, p]) => (
        <li key={name}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium capitalize">
              {name}
              {name === target && <span className="ml-2 text-xs text-muted">(your choice)</span>}
            </span>
            <span>{Math.round(p * 100)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-parchment-300" aria-hidden="true">
            <div className={cn('h-full rounded-full', name === target ? 'bg-terracotta' : 'bg-forest/70')} style={{ width: `${Math.round(p * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-control bg-parchment-200 p-3 text-sm text-ink/80">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        This is a style-similarity estimate from a small model trained on 132 images. It is not a quality score, a certificate of authenticity or an expert judgement.
      </span>
    </p>
  )
}

function UploadedImage({ src }: { src: string }) {
  const [gone, setGone] = useState(false)
  if (gone) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-card bg-parchment-200 p-6 text-center text-sm text-muted">
        This image is no longer stored. Uploads are deleted after 24 hours.
      </div>
    )
  }
  return <img src={src} alt="Your uploaded artwork" onError={() => setGone(true)} className="max-h-[380px] w-full rounded-card object-contain" />
}

export function ResultsView({ report }: { report: AnalysisReport }) {
  const probs = report.probabilities ?? {}
  const top = Object.values(probs).length ? Math.max(...Object.values(probs)) : 0
  const lowConfidence = report.automated_supported && report.looks_like_artwork && top < LOW_CONFIDENCE
  const differs = !!report.predicted_art_form && report.predicted_art_form !== report.target_art_form
  const showEstimate = report.automated_supported && report.looks_like_artwork

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Your artwork</h2>
        <UploadedImage src={report.image_url} />
        {report.user_note && <p className="mt-3 text-sm text-muted" dir="auto">Your note: {report.user_note}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Style similarity</h2>
        {!report.looks_like_artwork ? (
          <div role="alert" className="rounded-control bg-[#FFF1D6] p-4 text-[#5C3A00]">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" /> This does not look like a painting or drawing
            </p>
            <p className="mt-2">{report.overall_assessment}</p>
            <LinkButton to="/analyse" variant="dark" className="mt-4">
              Try another image
            </LinkButton>
          </div>
        ) : showEstimate ? (
          <>
            <div className="flex flex-wrap items-center gap-5">
              <StyleGauge value={report.style_match_score} label="Style similarity" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Looks most like <span className="capitalize">{report.predicted_art_form}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{report.style_match_comment}</p>
              </div>
            </div>
            {differs && (
              <p role="status" className="mt-4 rounded-control bg-ochre-50 p-3 text-sm">
                You selected <strong>{report.target_name}</strong>, but the model finds this image more similar to <strong className="capitalize">{report.predicted_art_form}</strong>. Compare your work with the reference and technique notes.
              </p>
            )}
            {lowConfidence && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-control bg-[#FFF1D6] p-3 text-sm text-[#5C3A00]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Low confidence: no style reaches 50%, so treat this result with caution.
              </p>
            )}
            <div className="mt-5">
              <ProbabilityBars probabilities={probs} target={report.target_art_form} />
            </div>
          </>
        ) : (
          <div>
            <Badge tone="ochre">Guidance only</Badge>
            <p className="mt-3">{report.overall_assessment}</p>
          </div>
        )}
        {report.warnings?.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-[#7A4B00]">
            {report.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <Disclaimer />
        </div>
      </Card>

      {report.looks_like_artwork && (
        <>
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold">Feature checks</h2>
            <p className="mb-4 text-sm text-muted">Compared with reference features. Only a few checks are reliable enough to show; the rest read &ldquo;Unable to assess&rdquo;.</p>
            <ul className="space-y-4">
              {report.feature_checks.map((f) => (
                <li key={f.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{f.title}</span>
                    <Badge tone={STATUS_TONE[f.status ?? 'unsure']}>{STATUS_LABEL[f.status ?? 'unsure']}</Badge>
                  </div>
                  <p className="text-sm text-muted">{f.description}</p>
                  <p className="text-sm"><span className="font-semibold text-terracotta-text">Tip: </span>{f.tip}</p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            {report.strengths.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-2 text-lg font-semibold">Strengths</h2>
                <ul className="list-disc space-y-1 pl-5">
                  {report.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Card>
            )}
            {report.areas_for_improvement.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-2 text-lg font-semibold">Areas to improve</h2>
                <ul className="space-y-3">
                  {report.areas_for_improvement.map((a) => (
                    <li key={a.feature}>
                      <p className="font-semibold">{a.feature}</p>
                      <p className="text-sm text-muted">{a.issue}</p>
                      <p className="text-sm"><span className="font-semibold text-terracotta-text">Try: </span>{a.fix}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden">
            <ResponsiveImage slug={report.reference_image_slug} ratio="16 / 10" sizes="(min-width: 1024px) 560px, 92vw" fallbackLabel="Reference image coming soon" />
            <div className="p-4">
              <h2 className="text-lg font-semibold">Reference example</h2>
              <p className="text-sm text-muted">AI-generated illustration in this style, for comparison.</p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">Next exercise</h2>
            <p>{report.next_exercise}</p>
          </Card>
        </>
      )}
    </div>
  )
}
