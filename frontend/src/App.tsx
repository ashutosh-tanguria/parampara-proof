import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { MobileBottomNav } from './components/layout/MobileBottomNav'
import { Footer } from './components/layout/Footer'
import { Splash } from './components/layout/Splash'
import { ToastProvider } from './components/ui/Toast'
import { Skeleton } from './components/ui/basic'
import { ArtFormsProvider } from './lib/artForms'

const HomePage = lazy(() => import('./pages/HomePage'))
const ArtFormsPage = lazy(() => import('./pages/ArtFormsPage'))
const ArtFormDetailPage = lazy(() => import('./pages/ArtFormDetailPage'))
const AnalysePage = lazy(() => import('./pages/AnalysePage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const LearnPage = lazy(() => import('./pages/LearnPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function PageFallback() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading page">
      <Skeleton className="mb-4 h-10 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function App() {
  return (
    <ToastProvider>
      <ArtFormsProvider>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Splash />
        <ScrollToTop />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main id="main" tabIndex={-1} className="flex-1 pb-20 outline-none md:pb-0">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/art-forms" element={<ArtFormsPage />} />
                <Route path="/art-forms/:slug" element={<ArtFormDetailPage />} />
                <Route path="/analyse" element={<AnalysePage />} />
                <Route path="/analysis/:id" element={<ResultsPage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        <MobileBottomNav />
      </ArtFormsProvider>
    </ToastProvider>
  )
}
