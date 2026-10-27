import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import { Dropzone } from '../components/ui/Dropzone'
import { Stepper } from '../components/ui/Stepper'
import { Badge, Button, Chip, ErrorState, ProgressBar } from '../components/ui/basic'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { analyzeImage, ApiError, isAbort } from '../lib/api'
import { SAMPLE_THUMBS, useArtForms } from '../lib/artForms'
import { saveHistoryEntry, usePageTitle } from '../lib/hooks'
import { validateImageFile } from '../lib/validate'
import type { AnalysisReport } from '../types'

type Phase = 'upload' | 'select' | 'running' | 'error'
type RunStage = 'uploading' | 'analysing' | 'preparing'

const STAGES: Array<{ id: RunStage; label: string }> = [
  { id: 'uploading', label: 'Uploading your image' },
  { id: 'analysing', label: 'Analysing patterns and shapes' },
  { id: 'preparing', label: 'Preparing feedback' },
]
const NOTE_MAX = 500

export default function AnalysePage() {
  usePageTitle('Analyse your artwork')
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { forms } = useArtForms()
  const [phase, setPhase] = useState<Phase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [artForm, setArtForm] = useState<string>(params.get('art_form') ?? '')
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<RunStage>('uploading')
  const [uploadPct, setUploadPct] = useState(0)
  const [runError, setRunError] = useState<ApiError | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const busy = useRef(false)

  const previewUrl = useRef<string | null>(null)
  // Cancel any request and release the preview if the user leaves the page.
  useEffect(
    () => () => {
      ctrl.current?.abort()
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    },
    [],
  )
  const setImage = useCallback((f: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = f ? URL.createObjectURL(f) : null
    setFile(f)
    setPreview(previewUrl.current)
  }, [])

  const accept = useCallback(async (f: File) => {
    setFileError(null)
    setWarning(null)
    const res = await validateImageFile(f)
    if (!res.ok) {
      setImage(null)
      setFileError(res.error ?? null)
      return
    }
    setWarning(res.warning ?? null)
    setImage(f)
  }, [setImage])

  const loadSample = async (art: string) => {
    try {
      const res = await fetch(`/assets/samples/sample-${art}.jpg`)
      if (!res.ok) throw new Error('missing')
      const blob = await res.blob()
      await accept(new File([blob], `sample-${art}.jpg`, { type: 'image/jpeg' }))
      setArtForm(art)
    } catch {
      setFileError('Could not load the sample image. Please try another file.')
    }
  }

  const run = async () => {
    if (!file || !artForm || busy.current) return
    busy.current = true
    setRunError(null)
    setStage('uploading')
    setUploadPct(0)
    setPhase('running')
    ctrl.current = new AbortController()
    try {
      const report: AnalysisReport = await analyzeImage(file, artForm, note, {
        signal: ctrl.current.signal,
        onUploadProgress: (f) => setUploadPct(Math.round(f * 100)),
        onUploaded: () => setStage('analysing'),
      })
      setStage('preparing')
      saveHistoryEntry({
        id: report.id,
        art_form: report.target_art_form,
        target_name: report.target_name,
        style_match: report.automated_supported && report.looks_like_artwork ? report.style_match_score : null,
        created_at: report.created_at ?? new Date().toISOString(),
        image_url: report.image_url,
      })
      nav(`/analysis/${report.id}`, { state: { report } })
    } catch (e) {
      if (isAbort(e)) {
        setPhase('select')
      } else {
        setRunError(e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Something went wrong.'))
        setPhase('error')
      }
    } finally {
      busy.current = false
    }
  }

  const cancel = () => ctrl.current?.abort()
  const reset = () => {
    setImage(null)
    setPhase('upload')
    setFileError(null)
    setWarning(null)
  }
  const step = phase === 'upload' ? 1 : phase === 'select' ? 2 : 3
  const stageIndex = STAGES.findIndex((s) => s.id === stage)
  const overall = stage === 'uploading' ? uploadPct * 0.3 : stage === 'analysing' ? 30 + 55 : 95

  return (
    <div className="container-page py-8">
      <Stepper current={step} />
      <h1 className="mb-1 mt-6 text-3xl font-semibold">
        {phase === 'running' ? 'Analysing Your Artwork' : phase === 'select' ? 'Select Art Form' : 'Upload Your Artwork'}
      </h1>
      <p className="mb-6 text-muted">Get a style-similarity estimate and practice tips. It is not a quality score or a judgement of authenticity.</p>

      {phase === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Dropzone onFile={accept} error={fileError} />
            <p className="mt-3 flex items-start gap-2 text-sm text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Your uploads are deleted from our server after 24 hours.
            </p>
          </div>
          <div>
            {file && preview ? (
              <div className="relative overflow-hidden rounded-card border border-parchment-300 bg-parchment-50 shadow-warm">
                <img src={preview} alt="Preview of your uploaded artwork" className="max-h-[360px] w-full object-contain" />
                <button type="button" onClick={reset} aria-label="Remove image" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-parchment-50/95 shadow-warm">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-card border border-parchment-300 bg-parchment-200 p-6 text-center text-muted">
                Your image preview will appear here.
              </div>
            )}
            {warning && <p role="status" className="mt-2 text-sm text-[#7A4B00]">{warning}</p>}
          </div>
          <div className="lg:col-span-2">
            <p className="mb-2 text-sm font-semibold">Try with a sample</p>
            <ul className="flex flex-wrap gap-3">
              {Object.entries(SAMPLE_THUMBS).map(([art, thumb]) => (
                <li key={art}>
                  <button type="button" onClick={() => loadSample(art)} className="group w-24 text-center" aria-label={`Use the ${art} sample image`}>
                    <ResponsiveImage slug={thumb} ratio="1 / 1" sizes="96px" className="rounded-control border border-parchment-300" />
                    <span className="mt-1 block text-xs capitalize">{art}</span>
                  </button>
                </li>
              ))}
            </ul>
            <label htmlFor="note" className="mb-1 mt-6 block text-sm font-semibold">
              Tell us about your artwork (optional)
            </label>
            <textarea
              id="note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              dir="auto"
              placeholder="For example: I am trying to draw a village scene but am unsure about the proportions."
              className="w-full rounded-control border border-parchment-400 bg-parchment-50 p-3"
            />
            <p className="text-right text-xs text-muted">{note.length}/{NOTE_MAX}</p>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" disabled={!file} onClick={() => setPhase('select')}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'select' && (
        <div>
          <p className="mb-3 font-medium">Which art form is this artwork meant to be?</p>
          <div role="group" aria-label="Art form" className="flex flex-wrap gap-3">
            {forms.map((f) => (
              <Chip key={f.slug} active={artForm === f.slug} onClick={() => setArtForm(f.slug)} className="!pl-2">
                <ResponsiveImage slug={f.image_slug} ratio="1 / 1" sizes="40px" className="h-9 w-9 rounded-full" fallbackLabel="" />
                {f.name}
                {!f.automated_supported && <Badge tone="ochre">Guidance only</Badge>}
              </Chip>
            ))}
          </div>
          {artForm && forms.find((f) => f.slug === artForm && !f.automated_supported) && (
            <p role="status" className="mt-4 rounded-control bg-ochre-50 p-3 text-sm">
              Guidance only: there is no automated analysis for this art form. You will get its key characteristics to review your own work against.
            </p>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setPhase('upload')}>Back</Button>
            <Button disabled={!artForm} onClick={run}>Analyse artwork</Button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="max-w-xl">
          <div aria-live="polite" role="status">
            <ul className="space-y-3">
              {STAGES.map((s, i) => (
                <li key={s.id} className={i <= stageIndex ? 'font-semibold text-ink' : 'text-muted'}>
                  {i < stageIndex ? '✓ ' : i === stageIndex ? '• ' : '○ '}
                  {s.label}
                  {s.id === 'uploading' && stage === 'uploading' ? ` (${uploadPct}%)` : ''}
                </li>
              ))}
            </ul>
          </div>
          <ProgressBar className="my-5" value={overall} label="Analysis progress" />
          <p className="text-sm text-muted">The first analysis after the server starts can take longer while the model warms up.</p>
          <Button variant="outline" className="mt-4" onClick={cancel}>Cancel</Button>
        </div>
      )}

      {phase === 'error' && runError && (
        <ErrorState
          title={runError.code === 'model_unavailable' ? 'Analysis is temporarily unavailable' : 'The analysis did not finish'}
          message={runError.message}
          onRetry={run}
        />
      )}
      {phase === 'error' && (
        <div className="mt-4">
          <Button variant="ghost" onClick={reset}>Start over</Button>
        </div>
      )}
    </div>
  )
}
