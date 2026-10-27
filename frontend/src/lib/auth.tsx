import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from './api'
import { jsonInit } from './upload'
import type { Me } from '../typesCraft'

interface AuthState {
  user: Me | null
  loading: boolean
  unread: number
  login: (username: string, password: string) => Promise<void>
  signup: (data: Record<string, unknown>) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: Me) => void
  refreshUnread: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const UNREAD_POLL_MS = 5000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    apiFetch<{ user: Me | null }>('/api/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null)) // the page that needs the server shows its own, specific error
      .finally(() => setLoading(false))
  }, [])

  const refreshUnread = useCallback(async () => {
    try {
      const r = await apiFetch<{ unread: number }>('/api/conversations/unread-count')
      setUnread(r.unread)
    } catch {
      /* keep the last badge */
    }
  }, [])

  // Plain polling for the unread badge (no WebSockets); paused while the tab is hidden.
  useEffect(() => {
    if (!user) {
      setUnread(0)
      return
    }
    const tick = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }
    tick()
    const id = window.setInterval(tick, UNREAD_POLL_MS)
    return () => window.clearInterval(id)
  }, [user, refreshUnread])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      unread,
      refreshUnread,
      setUser,
      login: async (username, password) => {
        const r = await apiFetch<{ user: Me }>('/api/auth/login', jsonInit('POST', { username, password }))
        setUser(r.user)
      },
      signup: async (data) => {
        const r = await apiFetch<{ user: Me }>('/api/auth/signup', jsonInit('POST', data))
        setUser(r.user)
      },
      logout: async () => {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' })
        } finally {
          setUser(null)
        }
      },
    }),
    [user, loading, unread, refreshUnread],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
