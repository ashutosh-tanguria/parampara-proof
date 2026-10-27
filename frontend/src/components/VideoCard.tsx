import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import type { VideoItem } from '../typesCraft'
import { ART_IMAGE } from '../typesCraft'
import { ResponsiveImage } from './ResponsiveImage'
import { Badge } from './ui/basic'
import { DemoBadge, TeacherLine } from './ui/extras'

export function kindLabel(v: VideoItem) {
  return v.kind === 'youtube' ? 'YouTube link' : v.kind === 'upload' ? 'Uploaded video' : 'Demo video, no real video attached'
}

export function VideoCard({ v }: { v: VideoItem }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-parchment-300 bg-parchment-50 shadow-warm">
      <Link to={`/teachers/${v.id}`} className="group relative block" aria-label={`${v.title}, ${kindLabel(v)}`}>
        <ResponsiveImage slug={ART_IMAGE[v.art_form] ?? null} ratio="16 / 9" sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw" fallbackLabel="Reference image coming soon" imgClassName="brightness-75" />
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-parchment-50/90 text-terracotta-dark"><Play className="h-6 w-6" /></span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-2">
          <DemoBadge show={v.is_demo} />
          <Badge tone="neutral" className="capitalize">{v.art_form}</Badge>
          <Badge tone="forest">{v.level}</Badge>
        </div>
        <h3 className="text-lg font-semibold"><Link to={`/teachers/${v.id}`} className="hover:underline">{v.title}</Link></h3>
        <TeacherLine t={v.teacher} />
        <p className="text-xs text-muted">{kindLabel(v)}</p>
      </div>
    </div>
  )
}
