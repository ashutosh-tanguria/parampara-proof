import { useState, type ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ResultsView, LOW_CONFIDENCE } from '../components/ResultsView'
import { ResponsiveImage } from '../components/ResponsiveImage'
import { Dropzone } from '../components/ui/Dropzone'
import { Stepper } from '../components/ui/Stepper'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState, ErrorState } from '../components/ui/basic'
import { makeReport } from './fixtures'

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('ResultsView', () => {
  it('shows every feature status with honest labels', () => {
    wrap(
      <ResultsView
        report={makeReport({
          feature_checks: [
            { id: 'a', title: 'A', status: 'present', description: '', tip: '' },
            { id: 'b', title: 'B', status: 'weak', description: '', tip: '' },
            { id: 'c', title: 'C', status: 'unsure', description: '', tip: '' },
            { id: 'd', title: 'D', status: 'manual_review', description: '', tip: '' },
          ],
        })}
      />,
    )
    expect(screen.getByText('Present')).toBeInTheDocument()
    expect(screen.getByText('Weak')).toBeInTheDocument()
    expect(screen.getByText('Unable to assess')).toBeInTheDocument()
    expect(screen.getByText('Review yourself')).toBeInTheDocument()
  })

  it('labels the number as style similarity, never as a score out of 100', () => {
    const { container } = wrap(<ResultsView report={makeReport()} />)
    expect(screen.getAllByText(/Style similarity/).length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: 'Style similarity: 72 percent' })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\/100|overall score|expert-verified|expert guidance/i)
    expect(screen.getByText(/not a quality score/i)).toBeInTheDocument()
  })

  it('shows the low-confidence warning only below 50%', () => {
    expect(LOW_CONFIDENCE).toBe(0.5)
    const low = makeReport({ probabilities: { warli: 0.4, madhubani: 0.3, gond: 0.2, pattachitra: 0.1 }, style_match_score: 0.4 })
    const { unmount } = wrap(<ResultsView report={low} />)
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument()
    unmount()
    wrap(<ResultsView report={makeReport()} />)
    expect(screen.queryByText(/Low confidence/)).not.toBeInTheDocument()
  })

  it('says so when the closest style differs from the chosen one', () => {
    wrap(
      <ResultsView
        report={makeReport({ predicted_art_form: 'gond', probabilities: { gond: 0.6, warli: 0.2, madhubani: 0.1, pattachitra: 0.1 }, style_match_score: 0.2 })}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/more similar to/i)
  })

  it('shows a gentle message and no estimate when the image is not artwork', () => {
    wrap(
      <ResultsView
        report={makeReport({
          looks_like_artwork: false,
          probabilities: {},
          predicted_art_form: null,
          style_match_score: 0,
          feature_checks: [],
          strengths: [],
          areas_for_improvement: [],
          overall_assessment: 'This image does not look like a painting.',
        })}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/does not look like a painting/i)
    expect(screen.queryByText(/Looks most like/)).not.toBeInTheDocument()
  })

  it('shows guidance only (no probabilities) for forms without a model', () => {
    wrap(
      <ResultsView
        report={makeReport({
          automated_supported: false,
          probabilities: {},
          predicted_art_form: null,
          target_name: 'Kalamkari',
          feature_checks: [{ id: 'x', title: 'Natural dyes', status: 'manual_review', description: '', tip: '' }],
        })}
      />,
    )
    expect(screen.getByText('Guidance only')).toBeInTheDocument()
    expect(screen.queryByText(/Looks most like/)).not.toBeInTheDocument()
  })

  it('always shows the disclaimer', () => {
    wrap(<ResultsView report={makeReport()} />)
    expect(screen.getByText(/style-similarity estimate from a small model/i)).toBeInTheDocument()
  })

  it('explains an expired upload instead of a broken image', () => {
    wrap(<ResultsView report={makeReport()} />)
    fireEvent.error(screen.getByAltText('Your uploaded artwork'))
    expect(screen.getByText(/deleted after 24 hours/i)).toBeInTheDocument()
  })
})

describe('ResponsiveImage', () => {
  it('renders webp and jpeg sources with alt text and dimensions', () => {
    const { container } = render(<ResponsiveImage slug="warli" />)
    expect(container.querySelector('source[type="image/webp"]')).toBeTruthy()
    const img = screen.getByRole('img')
    expect(img.getAttribute('alt')).toMatch(/Warli/)
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('loads the hero eagerly with high priority', () => {
    render(<ResponsiveImage slug="home-hero" priority />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  it('falls back to a pattern when the image fails', () => {
    render(<ResponsiveImage slug="warli" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img', { name: /coming soon/i })).toBeInTheDocument()
  })

  it('shows the pattern for a null slug (Pattachitra)', () => {
    render(<ResponsiveImage slug={null} />)
    expect(screen.getByRole('img', { name: /coming soon/i })).toBeInTheDocument()
  })
})

describe('Dropzone', () => {
  it('passes the chosen file on and shows an error message', async () => {
    const onFile = vi.fn()
    const { rerender } = render(<Dropzone onFile={onFile} />)
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Artwork image file'), file)
    expect(onFile).toHaveBeenCalledWith(file)
    rerender(<Dropzone onFile={onFile} error="Unsupported file type." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type.')
  })

  it('accepts dropped files', () => {
    const onFile = vi.fn()
    render(<Dropzone onFile={onFile} />)
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    fireEvent.drop(screen.getByText(/Drag and drop/).parentElement!, { dataTransfer: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })
})

describe('Stepper', () => {
  it('marks done, current and upcoming steps', () => {
    render(<Stepper current={3} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).toHaveTextContent('(done)')
    expect(items[3]).not.toHaveAttribute('aria-current')
  })
})

describe('Tabs', () => {
  it('switches with arrow keys and keeps one tab in the tab order', async () => {
    const Harness = () => {
      const [v, setV] = useState('a')
      return (
        <Tabs
          label="t"
          value={v}
          onChange={setV}
          items={[
            { id: 'a', label: 'A', content: 'panel a' },
            { id: 'b', label: 'B', content: 'panel b' },
          ]}
        />
      )
    }
    render(<Harness />)
    const a = screen.getByRole('tab', { name: 'A' })
    a.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('panel b')).toBeVisible()
    expect(a).toHaveAttribute('tabindex', '-1')
  })
})

describe('Error and empty states', () => {
  it('lets the user retry', async () => {
    const retry = vi.fn()
    render(<ErrorState message="Could not reach the server." onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.')
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(retry).toHaveBeenCalled()
  })

  it('renders an empty state with an action', () => {
    render(<EmptyState title="No analyses yet" action={<button>Upload</button>} />)
    expect(screen.getByText('No analyses yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })
})
