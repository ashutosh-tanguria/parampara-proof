import type { AnalysisReport } from '../types'

export function makeReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    id: 'a'.repeat(32),
    image_url: '/uploads/test.jpg',
    target_art_form: 'warli',
    target_name: 'Warli Painting',
    automated_supported: true,
    model_version: 'CLIP test',
    probabilities: { warli: 0.72, madhubani: 0.1, gond: 0.1, pattachitra: 0.08 },
    predicted_art_form: 'warli',
    style_match_score: 0.72,
    overall_score: null,
    overall_assessment: 'The closest style is Warli.',
    style_match_comment: 'Classifier probability for Warli: 72%.',
    looks_like_artwork: true,
    confidence_note: 'A rough estimate.',
    warnings: [],
    strengths: ['Tentative visual signal consistent with white on earth'],
    areas_for_improvement: [
      { feature: 'Village Scenes', issue: 'Could not be assessed automatically; check this yourself', why_it_matters: 'why', fix: 'Add huts' },
    ],
    feature_checks: [
      { id: 'white_on_earth', title: 'White On Earth', status: 'present', description: 'd1', tip: 't1' },
      { id: 'circle_dance', title: 'Circle Dance', status: 'weak', description: 'd2', tip: 't2' },
      { id: 'village_scenes', title: 'Village Scenes', status: 'unsure', description: 'd3', tip: 't3' },
    ],
    next_exercise: 'Draw a five-figure dance.',
    reference_image_slug: 'warli',
    user_note: null,
    ...overrides,
  }
}
