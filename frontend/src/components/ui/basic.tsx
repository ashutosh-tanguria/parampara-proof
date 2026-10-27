import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'outline' | 'dark' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-hover',
  outline: 'border border-terracotta-dark/50 bg-transparent text-terracotta-dark hover:bg-terracotta-50',
  dark: 'bg-forest text-white hover:bg-forest-900',
  ghost: 'text-ink hover:bg-parchment-300/60',
}
const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function Button({ variant = 'primary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={cn(base, variants[variant], className)} {...rest} />
}

export function LinkButton({ variant = 'primary', className, ...rest }: LinkProps & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...rest} />
}

export function Chip({
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-forest bg-forest text-white' : 'border-parchment-400 bg-parchment-50 text-ink hover:border-forest/50',
        className,
      )}
      {...rest}
    />
  )
}

type Tone = 'forest' | 'terracotta' | 'ochre' | 'neutral' | 'warning'
const tones: Record<Tone, string> = {
  forest: 'bg-forest/10 text-forest',
  terracotta: 'bg-terracotta-50 text-terracotta-dark',
  ochre: 'bg-ochre-50 text-[#7A5226]',
  neutral: 'bg-parchment-300 text-ink',
  warning: 'bg-[#FFF1D6] text-[#7A4B00]',
}
export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)} {...rest} />
}

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('print-card rounded-card border border-parchment-300 bg-parchment-50 shadow-warm', className)} {...rest} />
}

export function SectionHeader({ title, subtitle, action, as: H = 'h2' }: { title: string; subtitle?: string; action?: ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <H className="text-2xl font-semibold text-ink sm:text-3xl">{title}</H>
        {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 w-full overflow-hidden rounded-full bg-parchment-300"
      >
        <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-card', className)} />
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-parchment-400 bg-parchment-50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-terracotta-dark">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {text && <p className="mt-2 max-w-md text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-card border border-terracotta/30 bg-terracotta-50 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-terracotta-dark" aria-hidden="true" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-ink/80">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  )
}
