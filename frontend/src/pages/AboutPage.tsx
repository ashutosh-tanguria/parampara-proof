import { Link } from 'react-router-dom'
import { Card, LinkButton, SectionHeader } from '../components/ui/basic'
import { usePageTitle } from '../lib/hooks'

export default function AboutPage() {
  usePageTitle('About and how it works')
  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <SectionHeader as="h1" title="About Parampara Proof" subtitle="A free learning aid for traditional Indian art, built as a competition prototype." />
      <Card className="p-5">
        <h2 className="text-xl font-semibold">How the style checker works</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>Your image is turned into a numeric description by CLIP, a general image model.</li>
          <li>A small classifier compares that description with 132 reference images and gives a probability for Madhubani, Warli, Gond and Pattachitra.</li>
          <li>Twenty short text prompts check for typical features of each style. Only four are reliable enough to show; the others say &ldquo;Unable to assess&rdquo;.</li>
        </ol>
      </Card>
      <Card className="p-5">
        <h2 className="text-xl font-semibold">What it is not</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>It is not a quality score, a grade, or a certificate of authenticity.</li>
          <li>Reported accuracy is about 79% in cross-validation, and Madhubani is the weakest style. It can be wrong, especially on beginner drawings, photos, or mixed styles.</li>
          <li>Kalamkari and pottery have guidance pages only. There is no automated analysis for them.</li>
          <li>The lesson videos and community members shown in design mockups do not exist yet. Community posts here are samples.</li>
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="text-xl font-semibold">Privacy</h2>
        <p className="mt-2">Uploaded images are stored under random names and deleted after 24 hours. No account is needed. Your history and saved items stay in your browser.</p>
      </Card>
      <Card className="p-5">
        <h2 className="text-xl font-semibold">Content review</h2>
        <p className="mt-2">All descriptions and tips are curated by the team and have not yet been reviewed by traditional artists. See <Link className="underline" to="/credits">Credits</Link> for sources and licences.</p>
      </Card>
      <p className="text-sm text-muted">Team: Ashutosh Tanguria, Prithika Banerjee and Shreesh Tripathi, IIT Kharagpur.</p>
      <LinkButton to="/analyse">Try the style checker</LinkButton>
    </div>
  )
}
