export type FeatureStatus = 'present' | 'weak' | 'unsure' | 'manual_review'

export interface KeyCharacteristic {
  id: string
  title: string
  description: string
  tip: string
  status?: FeatureStatus
}

export interface ArtFormSummary {
  slug: string
  name: string
  subtitle: string
  category: string
  /** Key into imageManifest, or null when no suitable image exists (pattern placeholder is shown). */
  image_slug: string | null
  automated_supported: boolean
  origin: string
  quote?: string
  overview?: string
}

export interface GalleryItem {
  title: string
  image_slug: string
}

export interface ArtFormDetail {
  slug: string
  name: string
  image_slug: string | null
  automated_supported: boolean
  origin: string
  quote: string
  overview: string
  key_characteristics: KeyCharacteristic[]
  materials_and_techniques: string[]
  common_mistakes: string[]
  next_exercise: string
  gallery: GalleryItem[]
}

export interface AreaForImprovement {
  feature: string
  issue: string
  why_it_matters: string
  fix: string
}

export interface AnalysisReport {
  id: string
  image_url: string
  target_art_form: string
  target_name: string
  automated_supported: boolean
  model_version: string
  probabilities: Record<string, number>
  predicted_art_form: string | null
  /** Probability the model gives to the chosen style (0 to 1). A style-similarity estimate, not a quality score. */
  style_match_score: number
  overall_score: null
  overall_assessment: string
  style_match_comment: string
  looks_like_artwork: boolean
  confidence_note: string
  warnings: string[]
  strengths: string[]
  areas_for_improvement: AreaForImprovement[]
  feature_checks: KeyCharacteristic[]
  next_exercise: string
  reference_image_slug: string | null
  user_note?: string | null
  language?: string
  created_at?: string
}

export interface Lesson {
  id: string
  title: string
  art_form: string
  summary: string
  status: 'coming_soon'
}

export interface LessonsPayload {
  lessons: Lesson[]
  common_mistakes: Array<{ art_form: string; mistake: string; fix: string }>
  practice_exercises: Array<{ id: string; title: string; art_form: string; steps: string }>
  tips: Array<{ art_form: string; tip: string }>
}

export interface CommunityPost {
  id: string
  title: string
  art_form: string
  artist: string
  image_slug: string | null
  image_url: string | null
  created_at: string
  likes: number
  comments: number
  is_sample: boolean
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  suggestions?: string[]
  references?: string[]
  artForm?: string
  error?: boolean
}

export interface ChatReply {
  response: string
  art_form: string
  art_name: string
  suggestions: string[]
  references: string[]
}

export interface HealthPayload {
  status: string
  version: string
  model_loaded: boolean
  clip_model: string | null
  sklearn_version: string | null
  classes: string[]
  model_version: string | null
  error?: string | null
}

export interface CreditRow {
  title: string
  source_url: string
  license: string
  author: string
  art: string
}

export interface HistoryEntry {
  id: string
  art_form: string
  target_name: string
  style_match: number | null
  created_at: string
  image_url: string
}

export interface ApiErrorBody {
  error: { code: string; message: string }
}
