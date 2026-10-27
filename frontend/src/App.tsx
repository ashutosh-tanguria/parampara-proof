import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { MobileBottomNav } from './components/layout/MobileBottomNav'
import { Footer } from './components/layout/Footer'
import { Splash } from './components/layout/Splash'
import { ToastProvider } from './components/ui/Toast'
import { Skeleton } from './components/ui/basic'
import { ArtFormsProvider } from './lib/artForms'
import { AuthProvider } from './lib/auth'

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
const AuthPage = lazy(() => import('./pages/AuthPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const TeachersPage = lazy(() => import('./pages/TeachersPage'))
const VideoDetailPage = lazy(() => import('./pages/VideoDetailPage'))
const VideoFormPage = lazy(() => import('./pages/VideoFormPage'))
const CraftspersonPage = lazy(() => import('./pages/CraftspersonPage'))
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'))
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'))
const ListingFormPage = lazy(() => import('./pages/ListingFormPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
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
      <AuthProvider>
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
                <Route path="/login" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage initial="signup" />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/teachers/new" element={<VideoFormPage />} />
                <Route path="/teachers/:id" element={<VideoDetailPage />} />
                <Route path="/teachers/:id/edit" element={<VideoFormPage />} />
                <Route path="/craftspeople/:id" element={<CraftspersonPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/new" element={<ListingFormPage />} />
                <Route path="/marketplace/:id" element={<ListingDetailPage />} />
                <Route path="/marketplace/:id/edit" element={<ListingFormPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:id" element={<MessagesPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        <MobileBottomNav />
      </ArtFormsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
