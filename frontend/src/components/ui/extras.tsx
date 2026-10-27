import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge, EmptyState, LinkButton, Skeleton } from './basic'
import { useAuth } from '../../lib/auth'

export function DemoBadge({ show = true }: { show?: boolean }) {
  return show ? <Badge tone="ochre">Demo data</Badge> : null
}

/** Shows children only when logged in; otherwise a clear prompt. Browsing pages never use this. */
export function RequireLogin({ children, what }: { children: ReactNode; what: string }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (!user) {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Please log in"
          text={`You need an account to ${what}. Browsing is open to everyone.`}
          action={<LinkButton to={`/login?next=${encodeURIComponent(loc.pathname)}`}>Log in or sign up</LinkButton>}
        />
      </div>
    )
  }
  return <>{children}</>
}

export function TeacherLine({ t }: { t: { id: number; display_name: string; region: string } }) {
  return (
    <span className="text-sm text-muted">
      <Link to={`/craftspeople/${t.id}`} className="font-medium text-ink hover:underline">
        {t.display_name}
      </Link>
      {t.region ? ` · ${t.region}` : ''}
    </span>
  )
}

export function FieldError({ id, text }: { id: string; text?: string | null }) {
  return text ? (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-terracotta-dark">
      {text}
    </p>
  ) : null
}

export const inputClass = 'min-h-[44px] w-full rounded-control border border-parchment-400 bg-parchment-50 px-3 py-2'
