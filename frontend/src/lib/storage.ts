// localStorage that never throws (private windows, blocked or full storage).
const memory = new Map<string, string>()

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw !== null) return JSON.parse(raw) as T
  } catch {
    /* fall through to the in-memory copy */
  }
  const mem = memory.get(key)
  if (mem !== undefined) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

/** Returns false when the browser refused to persist (the value is still kept for this session). */
export function writeJSON(key: string, value: unknown): boolean {
  const raw = JSON.stringify(value)
  memory.set(key, raw)
  try {
    window.localStorage.setItem(key, raw)
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  memory.delete(key)
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  seenSplash: 'pp_seen_splash',
  history: 'pp_analysis_history',
  saved: 'pp_saved_art_forms',
  chats: 'pp_chats',
  liked: 'pp_liked_posts',
} as const
