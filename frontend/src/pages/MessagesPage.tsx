import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../components/ui/basic'
import { DemoBadge, RequireLogin } from '../components/ui/extras'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/hooks'
import { jsonInit } from '../lib/upload'
import type { ConversationItem, DirectMessage } from '../typesCraft'

const POLL_MS = 4500
const MAX_LEN = 1000

function List({ activeId }: { activeId?: number }) {
  const { refreshUnread } = useAuth()
  const [items, setItems] = useState<ConversationItem[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    const load = () => {
      if (document.visibilityState !== 'visible') return
      apiFetch<{ conversations: ConversationItem[] }>('/api/conversations')
        .then((r) => alive && (setItems(r.conversations), setError(null)))
        .catch((e) => alive && setError(e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Something went wrong.')))
    }
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [tick, activeId])
  useEffect(() => {
    void refreshUnread()
  }, [items, refreshUnread])

  if (error && !items) return <ErrorState message={error.message} onRetry={() => setTick((t) => t + 1)} />
  if (!items) return <Skeleton className="h-64" />
  if (items.length === 0) return <EmptyState title="No conversations yet" text="Open a video or a marketplace listing and press Message to start one." action={<Link to="/teachers" className="text-sm font-semibold text-terracotta-text underline">Browse videos</Link>} />
  return (
    <ul className="divide-y divide-parchment-300 rounded-card border border-parchment-300 bg-parchment-50">
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`/messages/${c.id}`} aria-current={c.id === activeId} className={`block min-h-[64px] p-3 ${c.id === activeId ? 'bg-forest/10' : 'hover:bg-parchment-300/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold" dir="auto">{c.other.display_name}</span>
              {c.unread > 0 && <span aria-label={`${c.unread} unread`} className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
            </div>
            {c.context && <p className="truncate text-xs text-terracotta-text">About: {c.context.title || c.context.type}</p>}
            <p className="truncate text-sm text-muted" dir="auto">{c.last_message ?? 'No messages yet'}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Conversation({ id }: { id: number }) {
  const { user, refreshUnread } = useAuth()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [meta, setMeta] = useState<{ other: ConversationItem['other']; context: ConversationItem['context'] } | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const last = useRef(0)
  const bottom = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<{ messages: DirectMessage[]; other: ConversationItem['other']; context: ConversationItem['context'] }>(`/api/conversations/${id}/messages?after=${last.current}`)
      setMeta({ other: r.other, context: r.context })
      setError(null)
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].id
        setMessages((m) => [...m, ...r.messages.filter((n) => !m.some((x) => x.id === n.id))])
        if (r.messages.some((m) => m.sender_id !== user?.id)) {
          await apiFetch(`/api/conversations/${id}/read`, { method: 'POST' })
          void refreshUnread()
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Something went wrong.'))
    }
  }, [id, user?.id, refreshUnread])

  useEffect(() => {
    last.current = 0
    setMessages([])
    setMeta(null)
    void load()
    const t = window.setInterval(() => document.visibilityState === 'visible' && void load(), POLL_MS)
    return () => window.clearInterval(t)
  }, [id, load])
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "end" })
  }, [messages.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(null)
    try {
      await apiFetch(`/api/conversations/${id}/messages`, jsonInit('POST', { body }))
      setText('')
      await load()
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  if (error?.status === 404) return <EmptyState title="We could not find that conversation" action={<Link to="/messages" className="text-sm font-semibold underline">Back to messages</Link>} />
  if (error && !meta) return <ErrorState message={error.message} onRetry={() => void load()} />

  return (
    <section aria-label="Conversation" className="flex min-h-[60vh] flex-col rounded-card border border-parchment-300 bg-parchment-50 shadow-warm">
      <div className="flex items-center gap-3 border-b border-parchment-300 p-3">
        <Link to="/messages" aria-label="Back to conversations" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-parchment-300/60 md:hidden"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold" dir="auto">{meta?.other.display_name ?? '...'} <DemoBadge show={!!meta?.other.is_demo} /></h2>
          {meta?.context && (
            <p className="truncate text-xs text-terracotta-text">
              About:{' '}
              {meta.context.type === 'video' ? <Link className="underline" to={`/teachers/${meta.context.id}`}>{meta.context.title}</Link> : meta.context.type === 'listing' ? <Link className="underline" to={`/marketplace/${meta.context.id}`}>{meta.context.title}</Link> : meta.context.title || 'their profile'}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && <p className="text-muted">No messages yet. Say hello.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id
          return (
            <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              {/* Message text is rendered as plain text by React, so HTML or scripts in a message can never run. */}
              <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-card px-4 py-2 ${mine ? 'bg-forest text-white' : 'bg-parchment-200'}`} dir="auto">{m.body}</p>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-parchment-300 p-3">
        {sendError && <p role="alert" className="mb-2 text-sm text-terracotta-dark">{sendError}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="dm-input" className="sr-only">Type your message</label>
          <textarea id="dm-input" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))} rows={2} dir="auto" placeholder="Type your message" className="min-h-[48px] min-w-0 flex-1 rounded-control border border-parchment-400 bg-parchment-100 px-3 py-2" />
          <Button type="submit" disabled={!text.trim() || sending} aria-label="Send message" className="h-12 w-12 !px-0"><Send className="h-5 w-5" aria-hidden="true" /></Button>
        </div>
        <p className="mt-1 text-right text-xs text-muted">{text.length}/{MAX_LEN}. Please do not share phone numbers or addresses.</p>
      </form>
    </section>
  )
}

export default function MessagesPage() {
  usePageTitle('Messages')
  const { id } = useParams()
  const open = id ? Number(id) : undefined
  return (
    <RequireLogin what="send and read messages">
      <div className="container-page py-6">
        <h1 className="mb-4 text-3xl font-semibold">Messages <Badge tone="neutral">Demo</Badge></h1>
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          <div className={open ? 'hidden md:block' : ''}><List activeId={open} /></div>
          <div className={open ? '' : 'hidden md:block'}>
            {open && Number.isInteger(open) ? <Conversation key={open} id={open} /> : <EmptyState title="Pick a conversation" text="Choose one on the left, or start one from a video or listing." />}
          </div>
        </div>
      </div>
    </RequireLogin>
  )
}
