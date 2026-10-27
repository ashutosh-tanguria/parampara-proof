import { EmptyState, LinkButton } from '../components/ui/basic'
import { usePageTitle } from '../lib/hooks'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className="container-page py-16">
      <EmptyState
        title="We could not find that page"
        text="The link may be wrong or the page may have moved."
        action={<LinkButton to="/">Go to the home page</LinkButton>}
      />
    </div>
  )
}
