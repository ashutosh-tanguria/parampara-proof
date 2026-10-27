import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { Button } from './ui/basic'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { jsonInit } from '../lib/upload'

interface Props {
  toUserId: number
  contextType: 'video' | 'listing' | 'teacher'
  contextId?: number
  label: string
}

/** Starts (or reopens) a conversation, with the video or listing attached as context. Needs a login. */
export function MessageButton({ toUserId, contextType, contextId = 0, label }: Props) {
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user?.id === toUserId) return null

  const go = async () => {
    if (!user) return nav(`/login?next=${encodeURIComponent(loc.pathname)}`)
    setBusy(true)
    setError(null)
    try {
      const r = await apiFetch<{ id: number }>('/api/conversations', jsonInit('POST', { to_user_id: toUserId, context_type: contextType, context_id: contextId }))
      nav(`/messages/${r.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the conversation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button onClick={go} disabled={busy}>
        <MessageSquare className="h-4 w-4" aria-hidden="true" /> {label}
      </Button>
      {!user && <p className="mt-1 text-xs text-muted">You will be asked to log in first.</p>}
      {error && <p role="alert" className="mt-1 text-sm text-terracotta-dark">{error}</p>}
    </div>
  )
}
