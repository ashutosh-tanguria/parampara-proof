import { afterEach, describe, expect, it, vi } from 'vitest'
import { MESSAGES, validateImageFile } from '../lib/validate'
import { readJSON, writeJSON } from '../lib/storage'
import { apiFetch, ApiError } from '../lib/api'

function stubImage(width: number, height: number, fail = false) {
  class FakeImage {
    naturalWidth = width
    naturalHeight = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) {
      queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()))
    }
  }
  vi.stubGlobal('Image', FakeImage)
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
}

afterEach(() => vi.unstubAllGlobals())

describe('validateImageFile (client side, same rules as the server)', () => {
  it('rejects an empty file', async () => {
    expect((await validateImageFile(new File([], 'a.jpg', { type: 'image/jpeg' }))).error).toBe(MESSAGES.empty)
  })

  it('rejects unsupported types (PDF, GIF, SVG)', async () => {
    for (const type of ['application/pdf', 'image/gif', 'image/svg+xml', 'text/plain']) {
      expect((await validateImageFile(new File(['x'], 'a', { type }))).error).toBe(MESSAGES.type)
    }
  })

  it('rejects files over 10 MB', async () => {
    const f = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(f, 'size', { value: 10 * 1024 * 1024 + 1 })
    expect((await validateImageFile(f)).error).toBe(MESSAGES.tooLarge)
  })

  it('rejects unreadable images', async () => {
    stubImage(0, 0, true)
    expect((await validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).error).toBe(MESSAGES.unreadable)
  })

  it('rejects images under 30 px and accepts exactly 30 px', async () => {
    stubImage(29, 400)
    expect((await validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).error).toBe(MESSAGES.tooSmall)
    stubImage(30, 400)
    expect((await validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).ok).toBe(true)
  })

  it('rejects huge pixel counts', async () => {
    stubImage(20000, 20000)
    expect((await validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).error).toBe(MESSAGES.tooManyPixels)
  })

  it('warns, but accepts, images under 224 px', async () => {
    stubImage(100, 100)
    const r = await validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(r.ok).toBe(true)
    expect(r.warning).toMatch(/224/)
  })
})

describe('storage', () => {
  it('survives localStorage that throws (blocked or full)', () => {
    const boom = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
    expect(readJSON('k-missing', ['fallback'])).toEqual(['fallback'])
    expect(writeJSON('k-throw', { a: 1 })).toBe(false)
    expect(readJSON('k-throw', null)).toEqual({ a: 1 }) // kept in memory for this session
    vi.restoreAllMocks()
  })

  it('round-trips and ignores corrupt data', () => {
    expect(writeJSON('k-ok', [1, 2])).toBe(true)
    expect(readJSON('k-ok', [])).toEqual([1, 2])
    localStorage.setItem('k-bad', '{not json')
    expect(readJSON('k-bad', 'fallback')).toBe('fallback')
  })
})

describe('apiFetch', () => {
  it('turns the JSON error shape into an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'model_unavailable', message: 'Analysis is temporarily unavailable.' } }), { status: 503 })))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 503, code: 'model_unavailable' })
  })

  it('reports network failures in plain words', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    const err = await apiFetch<never>('/api/x').catch((e: ApiError) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('network')
  })

  it('times out', async () => {
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new DOMException('x', 'AbortError'))))))
    const err = await apiFetch<never>('/api/x', {}, 20).catch((e: ApiError) => e)
    expect(err.code).toBe('timeout')
  })
})
