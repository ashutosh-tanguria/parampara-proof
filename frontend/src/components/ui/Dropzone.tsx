import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '../../lib/cn'
import { MAX_UPLOAD_MB } from '../../lib/validate'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
  error?: string | null
}

export function Dropzone({ onFile, disabled, error }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const errId = 'dropzone-error'

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-card border-2 border-dashed px-4 py-10 text-center transition-colors',
          over ? 'border-terracotta bg-terracotta-50' : 'border-parchment-400 bg-parchment-200',
          error && 'border-terracotta',
        )}
      >
        <UploadCloud className="mb-3 h-10 w-10 text-terracotta-dark" aria-hidden="true" />
        <p className="font-semibold">Drag and drop your image here</p>
        <p className="my-1 text-sm text-muted">or</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="min-h-[44px] rounded-control bg-terracotta px-5 py-2.5 text-sm font-semibold text-white hover:bg-terracotta-hover disabled:opacity-50"
        >
          Choose a file
        </button>
        <label htmlFor="artwork-file" className="sr-only">
          Artwork image file
        </label>
        <input
          ref={input}
          id="artwork-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
        <p className="mt-3 text-xs text-muted">Supports JPG, PNG, WEBP (max {MAX_UPLOAD_MB} MB)</p>
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-2 text-sm font-medium text-terracotta-dark">
          {error}
        </p>
      )}
    </div>
  )
}
