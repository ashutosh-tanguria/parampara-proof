import { useState } from 'react'
import { imageManifest, type ImageSlug } from '../assets/imageManifest'
import { cn } from '../lib/cn'

/** Warli-style triangle pattern used when no suitable image exists or an image fails to load. */
export function PatternBlock({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Decorative pattern'}
      className={cn('relative flex h-full w-full items-end overflow-hidden bg-terracotta-dark', className)}
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(250,247,242,.14) 0 2px, transparent 2px 18px), repeating-linear-gradient(45deg, rgba(250,247,242,.14) 0 2px, transparent 2px 18px)',
      }}
    >
      {label && <span className="m-3 rounded-full bg-parchment-100/90 px-3 py-1 text-xs font-semibold text-terracotta-dark">{label}</span>}
    </div>
  )
}

interface Props {
  slug: ImageSlug | string | null | undefined
  /** CSS sizes attribute, e.g. "(min-width:1024px) 33vw, 100vw". */
  sizes?: string
  /** Hero image: eager load with high fetch priority. */
  priority?: boolean
  /** Overrides the alt text from the manifest. */
  alt?: string
  /** Shown instead of an image when slug is null or the image fails. */
  fallbackLabel?: string
  className?: string
  imgClassName?: string
  /** CSS aspect-ratio value, e.g. "4 / 3". Defaults to the image's own ratio. */
  ratio?: string
}

export function ResponsiveImage({ slug, sizes = '100vw', priority, alt, fallbackLabel, className, imgClassName, ratio }: Props) {
  const [failed, setFailed] = useState(false)
  const meta = slug ? (imageManifest as Record<string, (typeof imageManifest)[ImageSlug]>)[slug] : undefined
  const aspect = ratio ?? (meta ? `${meta.width} / ${meta.height}` : '4 / 3')

  if (!meta || failed) {
    return (
      <div className={cn('overflow-hidden', className)} style={{ aspectRatio: aspect }}>
        <PatternBlock label={fallbackLabel ?? 'Reference image coming soon'} />
      </div>
    )
  }

  const base = `/assets/${meta.group}/${slug}`
  const widths = meta.widths as readonly number[]
  const srcSet = (ext: string) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ')
  const fallbackW = widths.includes(960) ? 960 : widths[widths.length - 1]

  return (
    <div className={cn('overflow-hidden', className)} style={{ aspectRatio: aspect, backgroundColor: meta.color }}>
      <picture>
        <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
        <img
          src={`${base}-${fallbackW}.jpg`}
          srcSet={srcSet('jpg')}
          sizes={sizes}
          alt={alt ?? meta.alt}
          width={meta.width}
          height={meta.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          // @ts-expect-error fetchpriority is valid HTML but missing from older React typings
          fetchpriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
          style={{ objectPosition: meta.focal }}
        />
      </picture>
    </div>
  )
}
