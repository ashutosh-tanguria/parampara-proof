import { NavLink } from 'react-router-dom'
import { Compass, Home, MessageCircle, ScanSearch, User, Users } from 'lucide-react'
import { cn } from '../../lib/cn'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/art-forms', label: 'Explore', icon: Compass },
  { to: '/analyse', label: 'Analyse', icon: ScanSearch, centre: true },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/portfolio', label: 'Profile', icon: User },
]

export function MobileBottomNav() {
  return (
    <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-parchment-300 bg-parchment-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-6 items-end">
        {items.map(({ to, label, icon: Icon, end, centre }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => cn('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-terracotta-text' : 'text-muted')}>
              {({ isActive }) => (
                <>
                  {centre ? (
                    <span className={cn('-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-warm-lg', isActive ? 'bg-terracotta-hover' : 'bg-terracotta', 'text-white')}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
