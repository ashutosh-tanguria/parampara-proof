import React from 'react';
import { Sparkles, Search, User, Compass, BookOpen, Users, Camera, Palette } from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, onSearchClick }) => {
  const navItems = [
    { label: 'Home', route: '/' },
    { label: 'Art Forms', route: '/art-forms' },
    { label: 'Analyse', route: '/analyse' },
    { label: 'Learn', route: '/learn' },
    { label: 'Community', route: '/community' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EADFCF]/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-forest flex items-center justify-center text-[#F5EFE6] shadow-sm group-hover:bg-terracotta transition-colors overflow-hidden border border-ochre/40">
            <svg viewBox="0 0 100 100" className="w-6 h-6 text-ochre-light" fill="currentColor">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
              <polygon points="50,15 62,38 85,50 62,62 50,85 38,62 15,50 38,38" fill="currentColor" opacity="0.85" />
              <circle cx="50" cy="50" r="10" fill="#FAF7F2" />
            </svg>
          </div>
          <div>
            <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#153828] block leading-tight">
              Parampara Proof
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-widest text-terracotta font-semibold hidden sm:block">
              Learn • Analyse • Preserve
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = currentRoute === item.route || (item.route !== '/' && currentRoute.startsWith(item.route));
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-forest text-[#FAF7F2] shadow-sm'
                    : 'text-[#44403C] hover:text-[#153828] hover:bg-[#F3EFE6]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => navigate('/art-forms')}
            className="p-2 text-[#57534E] hover:text-[#153828] hover:bg-[#F3EFE6] rounded-full transition-colors"
            title="Search Art Forms"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F5EFE6] text-forest border border-[#EADFCF] hover:bg-forest hover:text-white transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-terracotta" />
            <span>AI Coach</span>
          </button>

          <button
            onClick={() => navigate('/portfolio')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium bg-forest text-[#FAF7F2] hover:bg-forest-light transition-all shadow-sm active:scale-95"
          >
            <div className="w-6 h-6 rounded-full bg-[#FAF7F2]/20 flex items-center justify-center text-xs font-bold">
              A
            </div>
            <span className="hidden sm:inline">Guest</span>
          </button>
        </div>

      </div>
    </header>
  );
};
