import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ArtFormsPage } from './pages/ArtFormsPage';
import { ArtFormDetailPage } from './pages/ArtFormDetailPage';
import { AnalyseUploadPage } from './pages/AnalyseUploadPage';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { LearnPage } from './pages/LearnPage';
import { ChatPage } from './pages/ChatPage';
import { CommunityPage } from './pages/CommunityPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ArtFormSummary, AnalysisReport } from './types';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  
  const [artForms, setArtForms] = useState<ArtFormSummary[]>([
    {
      slug: 'madhubani',
      name: 'Madhubani / Mithila',
      subtitle: 'Vibrant stories from Bihar',
      category: 'Painting',
      image: '/assets/art-forms/madhubani.jpg',
      automated_supported: true,
      origin: 'Mithila region, Bihar'
    },
    {
      slug: 'warli',
      name: 'Warli Painting',
      subtitle: 'Minimalist tribal art from Maharashtra',
      category: 'Tribal Art',
      image: '/assets/art-forms/warli.jpg',
      automated_supported: true,
      origin: 'Maharashtra'
    },
    {
      slug: 'gond',
      name: 'Gond Painting',
      subtitle: 'Nature-inspired tribal art from Madhya Pradesh',
      category: 'Tribal Art',
      image: '/assets/art-forms/gond.jpg',
      automated_supported: true,
      origin: 'Madhya Pradesh'
    },
    {
      slug: 'kalamkari',
      name: 'Kalamkari',
      subtitle: 'Hand-painted textile art',
      category: 'Textile',
      image: '/assets/art-forms/kalamkari.jpg',
      automated_supported: false,
      origin: 'Andhra Pradesh'
    },
    {
      slug: 'pottery',
      name: 'Traditional Pottery',
      subtitle: 'Timeless clay craftsmanship',
      category: 'Pottery',
      image: '/assets/art-forms/pottery.jpg',
      automated_supported: false,
      origin: 'Pan-India'
    },
    {
      slug: 'pattachitra',
      name: 'Pattachitra',
      subtitle: 'Classical narrative scroll art from Odisha',
      category: 'Painting',
      image: '/assets/art-forms/pattachitra.jpg',
      automated_supported: true,
      origin: 'Odisha & West Bengal'
    }
  ]);

  const [cachedReport, setCachedReport] = useState<AnalysisReport | null>(null);

  // Sync route changes with browser history
  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch live art forms catalogue from backend
  useEffect(() => {
    fetch('/api/art-forms')
      .then((res) => {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then((data) => {
        if (data.art_forms && data.art_forms.length > 0) {
          setArtForms(data.art_forms);
        }
      })
      .catch((err) => console.log('Using initial art form catalogue:', err.message));
  }, []);

  // Render route content
  const renderContent = () => {
    if (currentRoute === '/' || currentRoute === '') {
      return <HomePage navigate={navigate} artForms={artForms} />;
    }

    if (currentRoute === '/art-forms') {
      return <ArtFormsPage navigate={navigate} artForms={artForms} />;
    }

    if (currentRoute.startsWith('/art-forms/')) {
      const slug = currentRoute.replace('/art-forms/', '').split('/')[0];
      return <ArtFormDetailPage slug={slug} navigate={navigate} />;
    }

    if (currentRoute === '/analyse' || currentRoute.startsWith('/analyse?')) {
      const urlParams = new URLSearchParams(window.location.search);
      const initialArt = urlParams.get('art_form') || 'warli';
      return (
        <AnalyseUploadPage
          navigate={navigate}
          artForms={artForms}
          initialArtForm={initialArt}
          onAnalysisComplete={(report) => setCachedReport(report)}
        />
      );
    }

    if (currentRoute.startsWith('/analysis/')) {
      const id = currentRoute.replace('/analysis/', '').split('/')[0];
      return (
        <AnalysisResultsPage
          analysisId={id}
          navigate={navigate}
          cachedReport={cachedReport}
        />
      );
    }

    if (currentRoute === '/learn') {
      return <LearnPage navigate={navigate} />;
    }

    if (currentRoute === '/chat') {
      return <ChatPage navigate={navigate} />;
    }

    if (currentRoute === '/community') {
      return <CommunityPage navigate={navigate} />;
    }

    if (currentRoute === '/portfolio') {
      return <PortfolioPage navigate={navigate} />;
    }

    // Default Fallback
    return <HomePage navigate={navigate} artForms={artForms} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#292524]">
      {/* Desktop & Mobile Navbar */}
      <Navbar currentRoute={currentRoute} navigate={navigate} />

      {/* Main Content Area */}
      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Mobile Floating Bottom Bar */}
      <MobileBottomNav currentRoute={currentRoute} navigate={navigate} />

      {/* Footer */}
      <Footer navigate={navigate} />
    </div>
  );
}
