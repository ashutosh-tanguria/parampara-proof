import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Grid2x2, LogIn, MessageCircle, Search, User } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../lib/auth'
import { Menu, menuItem } from './Menu'

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex min-h-[44px] items-center gap-2" aria-label="Parampara Proof home">
      <img src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8" />
      <span className={cn('whitespace-nowrap font-serif text-lg font-semibold', light ? 'text-white' : 'text-ink')}>Parampara Proof</span>
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

function Badge({ n }: { n: number }) {
  return n > 0 ? (
    <span aria-label={`${n} unread messages`} className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta px-1 text-[11px] font-bold text-white">
      {n > 9 ? '9+' : n}
    </span>
  ) : null
}

export function Navbar() {
  const { user, unread, logout } = useAuth()
  const nav = useNavigate()

  return (
    <header className="no-print sticky top-0 z-40 border-b border-parchment-300 bg-parchment-100/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center whitespace-nowrap rounded-control px-2 text-sm font-medium transition-colors lg:px-3',
                  isActive ? 'bg-forest/10 font-semibold text-forest' : 'text-ink/80 hover:bg-parchment-300/60',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-0.5">
          <Link to="/art-forms?search=1" aria-label="Search art forms" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-parchment-300/60">
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/chat" aria-label="AI Coach" className="hidden min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-medium hover:bg-parchment-300/60 xl:flex">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> <span>AI Coach</span>
          </Link>
          <Menu label="More pages" button={<><Grid2x2 className="h-5 w-5" aria-hidden="true" /><span className="hidden lg:inline">More</span><Badge n={unread} /></>}>
            <Link to="/teachers" role="menuitem" className={menuItem}>Learn from craftspeople</Link>
            <Link to="/marketplace" role="menuitem" className={menuItem}>Marketplace</Link>
            <Link to="/messages" role="menuitem" className={menuItem}>
              Messages {unread > 0 && <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
            </Link>
            <Link to="/chat" role="menuitem" className={cn(menuItem, 'xl:hidden')}>AI Coach</Link>
            <Link to="/portfolio" role="menuitem" className={menuItem}>My portfolio</Link>
            <Link to="/about" role="menuitem" className={menuItem}>About</Link>
          </Menu>
          {user ? (
            <Menu label={`Account: ${user.display_name}`} button={<><User className="h-5 w-5" aria-hidden="true" /><span className="hidden max-w-[110px] truncate lg:inline">{user.display_name}</span></>}>
              <p className="px-3 py-2 text-xs text-muted">
                Signed in as <strong>{user.display_name}</strong> ({user.role === 'craftsperson' ? 'Craftsperson' : 'Learner'})
              </p>
              <Link to="/account" role="menuitem" className={menuItem}>My profile</Link>
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={async () => {
                  await logout()
                  nav('/')
                }}
              >
                Log out
              </button>
            </Menu>
          ) : (
            <Link to="/login" className="ml-1 flex min-h-[44px] items-center gap-2 rounded-control bg-forest px-3 text-sm font-semibold text-white hover:bg-forest-900">
              <LogIn className="h-4 w-4" aria-hidden="true" /> <span className="hidden lg:inline">Log in</span>
              <span className="sr-only lg:hidden">Log in or sign up</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
