import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

/** Renders the coach's light markup (bold, bullet and numbered lines, quotes) without innerHTML. */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={blocks.length} className={list.ordered ? 'ml-5 list-decimal space-y-1' : 'ml-5 list-disc space-y-1'}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    )
    list = null
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = /^[-*]\s+(.*)/.exec(line)
    const num = /^\d+\.\s+(.*)/.exec(line)
    if (bullet || num) {
      const ordered = !!num
      if (list && list.ordered !== ordered) flush()
      list = list ?? { ordered, items: [] }
      list.items.push((bullet ?? num)![1])
      continue
    }
    flush()
    if (!line) continue
    if (line.startsWith('>')) {
      blocks.push(
        <blockquote key={blocks.length} className="border-l-4 border-ochre pl-3 italic">
          {inline(line.replace(/^>\s*/, ''))}
        </blockquote>,
      )
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>)
    }
  }
  flush()
  return <div className="space-y-2">{blocks}</div>
}
