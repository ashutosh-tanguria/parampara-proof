import React from 'react';
import { Home, Compass, Camera, Users, User, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentRoute, navigate }) => {
  const navTabs = [
    { label: 'Home', route: '/', icon: Home },
    { label: 'Explore', route: '/art-forms', icon: Compass },
    { label: 'Analyse', route: '/analyse', icon: Camera, isCenter: true },
    { label: 'Chat', route: '/chat', icon: MessageSquare },
    { label: 'Community', route: '/community', icon: Users },
    { label: 'Profile', route: '/portfolio', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#EADFCF] pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 px-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentRoute === tab.route || (tab.route !== '/' && currentRoute.startsWith(tab.route));

          if (tab.isCenter) {
            return (
              <button
                key={tab.route}
                onClick={() => navigate(tab.route)}
                className="flex flex-col items-center -mt-5 group"
                aria-label="Analyse Artwork"
              >
                <div className="w-12 h-12 rounded-full bg-terracotta text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform border-2 border-[#FAF7F2]">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-terracotta mt-0.5">
                  Analyse
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.route}
              onClick={() => navigate(tab.route)}
              className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
                isActive ? 'text-forest font-bold' : 'text-[#78716C] hover:text-forest'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-forest' : 'stroke-[1.75px]'}`} />
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-forest' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
