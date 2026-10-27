import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from './api'
import { KEYS, readJSON, writeJSON } from './storage'
import type { HistoryEntry } from '../types'

export interface ApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  reload: () => void
}

interface Settled<T> {
  key: string
  data: T | null
  error: ApiError | null
}

/** GET a JSON endpoint with loading, error and retry. Aborts on unmount or when the path changes. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [tick, setTick] = useState(0)
  const key = `${path}#${tick}`
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    if (path === null) return
    const ctrl = new AbortController()
    apiFetch<T>(path, { signal: ctrl.signal })
      .then((data) => setSettled({ key, data, error: null }))
      .catch((e) => {
        if (ctrl.signal.aborted) return
        setSettled({ key, data: null, error: e instanceof ApiError ? e : new ApiError(0, 'unknown', 'Something went wrong.') })
      })
    return () => ctrl.abort()
  }, [path, key])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const current = settled?.key === key ? settled : null
  return {
    data: current?.data ?? settled?.data ?? null,
    error: current?.error ?? null,
    loading: path !== null && current === null,
    reload,
  }
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Parampara Proof` : 'Parampara Proof | Learn traditional Indian art'
  }, [title])
}

/** A list persisted in localStorage (guest data; never leaves this browser). */
export function useStoredList<T>(key: string, max = 50): [T[], (item: T) => void, (pred: (x: T) => boolean) => void, boolean] {
  const [items, setItems] = useState<T[]>(() => readJSON<T[]>(key, []))
  const [persisted, setPersisted] = useState(true)

  const commit = (next: T[]) => {
    setItems(next)
    setPersisted(writeJSON(key, next))
  }
  const add = (item: T) => commit([item, ...items].slice(0, max))
  const remove = (pred: (x: T) => boolean) => commit(items.filter((x) => !pred(x)))
  return [items, add, remove, persisted]
}

export function saveHistoryEntry(entry: HistoryEntry) {
  const list = readJSON<HistoryEntry[]>(KEYS.history, [])
  const next = [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, 30)
  writeJSON(KEYS.history, next)
}
