// Upload limits and messages. These MUST stay identical to backend/uploads.py.
export const MAX_UPLOAD_MB = 10
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const MIN_DIMENSION = 30
export const MAX_PIXELS = 40_000_000
export const RECOMMENDED_DIMENSION = 224
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const MESSAGES = {
  type: 'Unsupported file type. Please upload a JPG, PNG or WEBP image.',
  empty: 'This file is empty.',
  tooLarge: `This image is larger than ${MAX_UPLOAD_MB} MB. Please choose a smaller file.`,
  tooSmall: `This image is too small (minimum ${MIN_DIMENSION} px on the shortest side).`,
  unreadable: 'We could not read this image. It may be corrupted.',
  tooManyPixels: `This image has too many pixels (maximum ${MAX_PIXELS / 1_000_000} megapixels). Please resize it and try again.`,
} as const

export interface ValidationResult {
  ok: boolean
  error?: string
  warning?: string
  width?: number
  height?: number
}

function readSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Cheap client-side checks for fast feedback. The server repeats them and is the authority. */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  if (file.size === 0) return { ok: false, error: MESSAGES.empty }
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: MESSAGES.type }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: MESSAGES.tooLarge }
  const size = await readSize(file)
  if (!size) return { ok: false, error: MESSAGES.unreadable }
  if (size.width * size.height > MAX_PIXELS) return { ok: false, error: MESSAGES.tooManyPixels }
  if (Math.min(size.width, size.height) < MIN_DIMENSION) return { ok: false, error: MESSAGES.tooSmall }
  const warning =
    Math.min(size.width, size.height) < RECOMMENDED_DIMENSION
      ? `This image is small (${size.width}x${size.height}). At least ${RECOMMENDED_DIMENSION} px gives more reliable results.`
      : undefined
  return { ok: true, warning, ...size }
}
