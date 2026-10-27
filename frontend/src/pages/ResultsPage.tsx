import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Printer, Share2 } from 'lucide-react'
import { ResultsView } from '../components/ResultsView'
import { Stepper } from '../components/ui/Stepper'
import { Button, EmptyState, ErrorState, LinkButton, Skeleton } from '../components/ui/basic'
import { useToast } from '../components/ui/Toast'
import { ApiError, apiFetch } from '../lib/api'
import { usePageTitle } from '../lib/hooks'
import type { AnalysisReport } from '../types'

export default function ResultsPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const fromState = (location.state as { report?: AnalysisReport } | null)?.report
  const [report, setReport] = useState<AnalysisReport | null>(fromState?.id === id ? fromState : null)
  const [failure, setFailure] = useState<{ tick: number; error: ApiError } | null>(null)
  const [tick, setTick] = useState(0)
  const error = failure?.tick === tick ? failure.error : null
  const toast = useToast()
  usePageTitle('Analysis results')

  useEffect(() => {
    if (report?.id === id) return
    const ctrl = new AbortController()
    apiFetch<AnalysisReport>(`/api/analysis/${encodeURIComponent(id)}`, { signal: ctrl.signal })
      .then(setReport)
      .catch((e) => {
        if (!ctrl.signal.aborted) setFailure({ tick, error: e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Something went wrong.') })
      })
    return () => ctrl.abort()
  }, [id, tick, report?.id])

  const share = async () => {
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) {
        await nav.share({ title: 'My Parampara Proof result', url })
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied. Uploaded images are deleted after 24 hours.')
    } catch {
      toast('Could not copy automatically. Copy the address from your browser.')
    }
  }

  if (error?.status === 404) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="We could not find this analysis"
          text="It may have expired (results and uploads are deleted after 24 hours) or the link is wrong."
          action={<LinkButton to="/analyse">Analyse a new artwork</LinkButton>}
        />
      </div>
    )
  }
  if (error) return <div className="container-page py-12"><ErrorState message={error.message} onRetry={() => setTick((t) => t + 1)} /></div>
  if (!report) {
    return (
      <div className="container-page py-8" aria-busy="true">
        <Skeleton className="mb-4 h-10 w-1/3" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <div className="no-print"><Stepper current={4} /></div>
      <div className="mb-6 mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Analysis Results</h1>
          <p className="text-muted">{report.target_name} &middot; {report.model_version}</p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" onClick={share}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share
          </Button>
          <Button variant="dark" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Download report
          </Button>
        </div>
      </div>
      <ResultsView report={report} />
      <div className="no-print mt-8">
        <LinkButton to="/analyse" variant="outline">Analyse another artwork</LinkButton>
      </div>
    </div>
  )
}
