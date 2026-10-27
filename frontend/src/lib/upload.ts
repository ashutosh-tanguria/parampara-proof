import { ApiError } from './api'

export interface UploadOptions {
  method?: 'POST' | 'PUT'
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

const UNREACHABLE = 'The server is not running or could not be reached. Start the backend (see the README), then try again.'

function parseError(status: number, text: string): ApiError {
  try {
    const body = JSON.parse(text) as { error?: { code: string; message: string } }
    if (body.error) return new ApiError(status, body.error.code, body.error.message)
  } catch {
    /* not JSON */
  }
  if (status >= 500) return new ApiError(status, 'backend_unreachable', UNREACHABLE)
  return new ApiError(status, 'http_error', `The upload was not accepted (error ${status}).`)
}

/** Multipart upload with real progress. XMLHttpRequest sends the login cookie for same-origin requests. */
export function uploadForm<T>(path: string, form: FormData, opts: UploadOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(opts.method ?? 'POST', path)
    xhr.timeout = 10 * 60 * 1000
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new ApiError(xhr.status, 'bad_response', 'The server sent an unexpected response.'))
        }
      } else reject(parseError(xhr.status, xhr.responseText))
    }
    xhr.onerror = () => reject(new ApiError(0, 'network', UNREACHABLE))
    xhr.ontimeout = () => reject(new ApiError(0, 'timeout', 'The upload took too long. Try a smaller file.'))
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'))
    opts.signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
