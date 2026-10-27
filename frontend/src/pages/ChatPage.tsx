import { useEffect, useRef, useState } from 'react'
import { Mic, Plus, Send } from 'lucide-react'
import { Button, Chip } from '../components/ui/basic'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { RichText } from '../components/RichText'
import { apiFetch, ApiError } from '../lib/api'
import { usePageTitle } from '../lib/hooks'
import { uid } from '../lib/id'
import { KEYS, readJSON, writeJSON } from '../lib/storage'
import type { ChatMessage, ChatReply } from '../types'

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
}
const MAX_LEN = 500
const STARTERS = ['How do I draw Warli human figures?', 'What colours does Madhubani use?', 'What are common Gond mistakes?']

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechCtor = new () => SpeechRecognitionLike
function getSpeech(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const newConv = (): Conversation => ({ id: uid(), title: 'New chat', messages: [] })

export default function ChatPage() {
  usePageTitle('AI Coach')
  const [convs, setConvs] = useState<Conversation[]>(() => {
    const saved = readJSON<Conversation[]>(KEYS.chats, [])
    return saved.length ? saved : [newConv()]
  })
  const [activeId, setActiveId] = useState(() => convs[0].id)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const Speech = typeof window !== 'undefined' ? getSpeech() : null
  const active = convs.find((c) => c.id === activeId) ?? convs[0]

  useEffect(() => {
    writeJSON(KEYS.chats, convs.slice(0, 20))
  }, [convs])
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' })
  }, [active.messages.length, pending])

  const update = (id: string, fn: (c: Conversation) => Conversation) => setConvs((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))

  const send = async (raw: string) => {
    const message = raw.trim().slice(0, MAX_LEN)
    if (!message || pending) return
    const id = active.id
    const userMsg: ChatMessage = { id: uid(), sender: 'user', text: message }
    update(id, (c) => ({ ...c, title: c.messages.length ? c.title : message.slice(0, 40), messages: [...c.messages, userMsg] }))
    setText('')
    setPending(true)
    try {
      const r = await apiFetch<ChatReply>('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, art_form: [...active.messages].reverse().find((m) => m.artForm)?.artForm ?? null }) })
      const reply: ChatMessage = { id: userMsg.id + 'r', sender: 'assistant', text: r.response, suggestions: r.suggestions, references: r.references, artForm: r.art_form || undefined }
      update(id, (c) => ({ ...c, messages: [...c.messages, reply] }))
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Something went wrong.'
      update(id, (c) => ({ ...c, messages: [...c.messages, { id: userMsg.id + 'e', sender: 'assistant', text: m, error: true }] }))
    } finally {
      setPending(false)
    }
  }

  const startVoice = () => {
    if (!Speech) return setVoiceMsg('Voice input is not supported in this browser. You can type your question instead.')
    setVoiceMsg(null)
    const rec = new Speech()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.onresult = (e) => setText((t) => (t + ' ' + e.results[0][0].transcript).trim().slice(0, MAX_LEN))
    rec.onerror = () => setVoiceMsg('Could not use the microphone. Check the browser permission, or type your question.')
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  return (
    <div className="container-page grid gap-6 py-6 md:grid-cols-[240px_1fr]">
      <aside aria-label="Recent chats" className="md:sticky md:top-20 md:self-start">
        <Button
          variant="dark"
          className="w-full"
          onClick={() => {
            const c = newConv()
            setConvs((cs) => [c, ...cs])
            setActiveId(c.id)
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> New Chat
        </Button>
        <h2 className="mb-2 mt-4 text-sm font-semibold text-muted">Recent (saved in this browser)</h2>
        <ul className="flex gap-2 overflow-x-auto md:block md:space-y-1">
          {convs.slice(0, 8).map((c) => (
            <li key={c.id} className="shrink-0">
              <button type="button" aria-current={c.id === active.id} onClick={() => setActiveId(c.id)} className={`min-h-[44px] w-full max-w-[220px] truncate rounded-control px-3 text-left text-sm ${c.id === active.id ? 'bg-forest/10 font-semibold' : 'hover:bg-parchment-300/60'}`}>
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section aria-label="Conversation" className="flex min-h-[60vh] flex-col rounded-card border border-parchment-300 bg-parchment-50 shadow-warm">
        <div className="border-b border-parchment-300 p-4">
          <h1 className="text-xl font-semibold">Chat with the Parampara coach</h1>
          <p className="text-sm text-muted">Answers come from the team&rsquo;s curated notes about each art form, not from a general AI model. They may be incomplete.</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Messages">
          {active.messages.length === 0 && (
            <div>
              <p className="mb-3 text-muted">Ask a question about Madhubani, Warli, Gond, Pattachitra, Kalamkari or pottery.</p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <Chip key={s} onClick={() => send(s)}>{s}</Chip>
                ))}
              </div>
            </div>
          )}
          {active.messages.map((m) => (
            <div key={m.id} className={m.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[92%] rounded-card px-4 py-3 sm:max-w-[80%] ${m.sender === 'user' ? 'bg-forest text-white' : m.error ? 'border border-terracotta/40 bg-terracotta-50' : 'bg-parchment-200'}`} dir="auto">
                {m.sender === 'assistant' && !m.error ? <RichText text={m.text} /> : <p>{m.text}</p>}
                {m.references && m.references.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {m.references.slice(0, 2).map((s) => (
                      <ResponsiveImage key={s} slug={s} ratio="4 / 3" sizes="200px" className="rounded-control" />
                    ))}
                  </div>
                )}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.suggestions.map((s) => (
                      <Chip key={s} className="!min-h-[44px] bg-parchment-50 text-ink" onClick={() => send(s)}>{s}</Chip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {pending && <p className="text-sm text-muted" role="status">The coach is typing...</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(text) }} className="border-t border-parchment-300 p-3">
          {voiceMsg && <p role="status" className="mb-2 text-sm text-[#7A4B00]">{voiceMsg}</p>}
          <div className="flex items-center gap-2">
            <label htmlFor="chat-input" className="sr-only">Type your message</label>
            <input id="chat-input" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))} dir="auto" placeholder="Type your message" className="min-h-[48px] flex-1 rounded-full border border-parchment-400 bg-parchment-100 px-4" />
            <button type="button" onClick={startVoice} aria-label={listening ? 'Listening' : 'Voice input'} aria-pressed={listening} className="flex h-12 w-12 items-center justify-center rounded-full border border-parchment-400 hover:bg-parchment-300/60">
              <Mic className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="submit" disabled={!text.trim() || pending} aria-label="Send message" className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta text-white disabled:opacity-50">
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
