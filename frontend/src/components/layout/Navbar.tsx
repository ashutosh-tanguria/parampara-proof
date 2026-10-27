import { Link, NavLink } from 'react-router-dom'
import { MessageCircle, Search, User } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex min-h-[44px] items-center gap-2" aria-label="Parampara Proof home">
      <img src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8" />
      <span className={cn('font-serif text-lg font-semibold', light ? 'text-white' : 'text-ink')}>Parampara Proof</span>
    </Link>
  )
}

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/art-forms', label: 'Art Forms' },
  { to: '/analyse', label: 'Analyse' },
  { to: '/learn', label: 'Learn' },
  { to: '/community', label: 'Community' },
]

export function Navbar() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-parchment-300 bg-parchment-100/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center rounded-control px-2 text-sm font-medium transition-colors lg:px-3',
                  isActive ? 'bg-forest/10 font-semibold text-forest' : 'text-ink/80 hover:bg-parchment-300/60',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/art-forms?search=1" aria-label="Search art forms" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-parchment-300/60">
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/chat" className="hidden min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-medium hover:bg-parchment-300/60 md:flex">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">AI Coach</span><span className="sr-only lg:hidden">AI Coach</span>
          </Link>
          <Link to="/portfolio" className="hidden min-h-[44px] items-center gap-2 rounded-control bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-900 md:flex">
            <User className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">Guest</span><span className="sr-only lg:hidden">Guest profile</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
