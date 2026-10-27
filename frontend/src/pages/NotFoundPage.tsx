import { LinkButton } from '../components/ui/basic'
import { usePageTitle } from '../lib/hooks'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className="container-page py-16 text-center">
      <h1 className="text-3xl font-semibold">We could not find that page</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">The link may be wrong or the page may have moved.</p>
      <LinkButton to="/" className="mt-6">
        Go to the home page
      </LinkButton>
    </div>
  )
}
