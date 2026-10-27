import { Link } from 'react-router-dom'
import { Logo } from './Navbar'

export function Footer() {
  return (
    <footer className="no-print mt-16 bg-forest pb-28 pt-12 text-white/90 md:pb-12">
      <div className="container-page grid gap-8 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm text-white/80">A free, open-source learning aid for traditional Indian art. It gives a style-similarity estimate, not a quality or authenticity score.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link className="py-2 hover:underline" to="/art-forms">Art Forms</Link>
          <Link className="py-2 hover:underline" to="/analyse">Analyse</Link>
          <Link className="py-2 hover:underline" to="/learn">Learn</Link>
          <Link className="py-2 hover:underline" to="/community">Community</Link>
          <Link className="py-2 hover:underline" to="/about">About and how it works</Link>
          <Link className="py-2 hover:underline" to="/credits">Credits</Link>
        </nav>
        <div className="text-sm text-white/80">
          <p>Illustrations are AI-generated and are not photographs of real artworks or artists.</p>
          <p className="mt-2">Built by Ashutosh Tanguria, Prithika Banerjee and Shreesh Tripathi, IIT Kharagpur. Code is MIT licensed.</p>
        </div>
      </div>
    </footer>
  )
}
