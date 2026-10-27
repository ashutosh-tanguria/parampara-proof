import { ArrowRight, BookOpen, ScanSearch, Sparkles } from 'lucide-react'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { ArtFormCard } from '../components/ArtFormCard'
import { Card, ErrorState, LinkButton, SectionHeader, Skeleton } from '../components/ui/basic'
import { useArtForms } from '../lib/artForms'
import { usePageTitle } from '../lib/hooks'

const stats = [
  { value: '6', label: 'Art forms' },
  { value: '4', label: 'With style analysis' },
  { value: 'Free', label: 'To use' },
  { value: 'Open', label: 'Source code' },
]

const steps = [
  { icon: BookOpen, title: 'Learn', text: 'Read about the history, materials and typical features of each art form.' },
  { icon: ScanSearch, title: 'Analyse', text: 'Upload a painting and see which of four styles it looks most like, with feature signals.' },
  { icon: Sparkles, title: 'Improve', text: 'Get practice tips and a next exercise based on the reference features of the style.' },
]

export default function HomePage() {
  usePageTitle('')
  const { forms, loading, error, reload } = useArtForms()
  const featured = forms.filter((f) => ['madhubani', 'warli', 'gond'].includes(f.slug))

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div className="animate-fade-up">
            <h1 className="text-[2rem] font-semibold leading-[1.15] sm:text-5xl sm:leading-[1.1]">
              Preserving India&rsquo;s Art. <span className="text-terracotta-text">Empowering</span> Future Generations.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              A free learning aid for traditional Indian art. Explore six art forms, then upload a painting to see how closely it resembles a reference style.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/art-forms">
                Explore Art Forms <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton to="/analyse" variant="outline">
                Upload Your Artwork
              </LinkButton>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span className="block font-serif text-3xl font-semibold text-terracotta-text">{s.value}</span>
                    <span className="text-sm text-muted" aria-hidden="true">
                      {s.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <ResponsiveImage
              slug="home-hero"
              priority
              sizes="(min-width: 1024px) 560px, 92vw"
              ratio="4 / 3"
              className="rounded-card shadow-warm-lg"
            />
            <p className="mt-2 text-xs text-muted">AI-generated illustration of Madhubani-style painting.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="container-page py-10">
        <SectionHeader title="How it works" subtitle="Three steps from curiosity to practice." />
        <h2 id="how" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-forest text-white">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-10">
        <SectionHeader
          title="Featured art forms"
          subtitle="Start with one of the styles the checker knows."
          action={
            <LinkButton to="/art-forms" variant="ghost">
              View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          }
        />
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((f) => (
              <ArtFormCard key={f.slug} form={f} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page grid gap-5 py-10 md:grid-cols-2">
        <Card className="overflow-hidden">
          <ResponsiveImage slug="painting-together" ratio="16 / 9" sizes="(min-width: 768px) 560px, 92vw" />
          <div className="p-5">
            <h2 className="text-xl font-semibold">Learn and Improve</h2>
            <p className="mt-1 text-muted">Common mistakes, practice exercises and tips for each style. Video lessons are planned and not available yet.</p>
            <LinkButton to="/learn" variant="outline" className="mt-4">
              Open Learn
            </LinkButton>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <ResponsiveImage slug="madhubani-woman-peacock" ratio="16 / 9" sizes="(min-width: 768px) 560px, 92vw" />
          <div className="p-5">
            <h2 className="text-xl font-semibold">Community</h2>
            <p className="mt-1 text-muted">See sample posts and share your own work. The posts on this prototype are samples, not real members.</p>
            <LinkButton to="/community" variant="outline" className="mt-4">
              Open Community
            </LinkButton>
          </div>
        </Card>
      </section>
    </>
  )
}
