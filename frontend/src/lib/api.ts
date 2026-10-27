import type { AnalysisReport, ApiErrorBody } from '../types'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const DEFAULT_TIMEOUT_MS = 20000
export const ANALYZE_TIMEOUT_MS = 90000

function toApiError(status: number, text: string): ApiError {
  try {
    const body = JSON.parse(text) as Partial<ApiErrorBody>
    if (body.error) return new ApiError(status, body.error.code, body.error.message)
  } catch {
    /* not JSON */
  }
  // A non-JSON error page means the request never reached our API (for example the dev proxy could not reach the backend).
  if (status >= 500) return new ApiError(status, 'backend_unreachable', 'The server is not running or did not respond. Start the backend (see the README) and try again.')
  return new ApiError(status, 'http_error', `The request was not accepted (error ${status}).`)
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController()
  const outer = init.signal
  const onAbort = () => ctrl.abort()
  outer?.addEventListener('abort', onAbort)
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    const text = await res.text()
    if (!res.ok) throw toApiError(res.status, text)
    return JSON.parse(text) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (outer?.aborted) throw e
    if (ctrl.signal.aborted) throw new ApiError(0, 'timeout', 'The server took too long to respond. Please try again.')
    throw new ApiError(0, 'network', 'The server is not running or could not be reached. Start the backend (see the README), then try again.')
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onAbort)
  }
}

export interface AnalyzeOptions {
  signal?: AbortSignal
  onUploadProgress?: (fraction: number) => void
  onUploaded?: () => void
  timeoutMs?: number
}

/** XMLHttpRequest is used (not fetch) because it reports real upload progress and can be aborted. */
export function analyzeImage(file: File, artForm: string, note: string, opts: AnalyzeOptions = {}): Promise<AnalysisReport> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('image', file, file.name)
    form.append('art_form', artForm)
    if (note.trim()) form.append('user_note', note.trim().slice(0, 500))
    form.append('language', 'English')

    xhr.open('POST', '/api/analyze')
    xhr.timeout = opts.timeoutMs ?? ANALYZE_TIMEOUT_MS
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onUploadProgress?.(e.loaded / e.total)
    }
    xhr.upload.onload = () => opts.onUploaded?.()
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AnalysisReport)
        } catch {
          reject(new ApiError(xhr.status, 'bad_response', 'The server sent an unexpected response.'))
        }
      } else {
        reject(toApiError(xhr.status, xhr.responseText))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, 'network', 'The server is not running or could not be reached. Start the backend (see the README), then try again.'))
    xhr.ontimeout = () => reject(new ApiError(0, 'timeout', 'The analysis took too long. Please try again.'))
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'))
    opts.signal?.addEventListener('abort', () => xhr.abort())
    if (opts.signal?.aborted) return xhr.abort()
    xhr.send(form)
  })
}

export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}
