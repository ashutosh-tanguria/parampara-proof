export interface KeyCharacteristic {
  id: string;
  title: string;
  description: string;
  tip: string;
  status?: 'present' | 'weak' | 'missing' | 'unsure' | 'manual_review';
}

export interface ArtFormSummary {
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  image: string;
  automated_supported: boolean;
  origin: string;
  quote?: string;
  overview?: string;
}

export interface ArtFormDetail {
  slug: string;
  name: string;
  hero_image: string;
  automated_supported: boolean;
  origin: string;
  quote: string;
  overview: string;
  key_characteristics: KeyCharacteristic[];
  materials_and_techniques: string[];
  common_mistakes: string[];
  next_exercise: string;
  reference_gallery: Array<{ title: string; image: string }>;
}

export interface AreaForImprovement {
  feature: string;
  issue: string;
  why_it_matters: string;
  fix: string;
}

export interface AnalysisReport {
  id: string;
  image_url: string;
  target_art_form: string;
  target_name: string;
  automated_supported: boolean;
  model_version: string;
  probabilities: Record<string, number>;
  predicted_art_form: string;
  style_match_score: number;
  overall_score?: number | null;
  overall_assessment: string;
  style_match_comment: string;
  strengths: string[];
  areas_for_improvement: AreaForImprovement[];
  feature_checks: KeyCharacteristic[];
  next_exercise: string;
  reference_artwork: string;
  user_note?: string;
  language?: string;
  created_at?: string;
}

export interface LessonItem {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  category: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  art_form: string;
  artist: string;
  avatar: string;
  image_url: string;
  created_at: string;
  likes: number;
  comments: number;
  is_curated: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
  references?: string[];
}
