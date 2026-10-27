// Accounts, craftspeople videos, marketplace and messages.
export type Role = 'learner' | 'craftsperson'

export interface Person {
  id: number
  display_name: string
  role: Role
  bio: string
  art_form: string | null
  region: string
  is_demo: boolean
}

export interface Me extends Person {
  username: string
}

export interface TeacherCard {
  id: number
  display_name: string
  art_form: string | null
  region: string
  is_demo: boolean
}

export type Level = 'Beginner' | 'Intermediate' | 'Advanced'

export interface VideoItem {
  id: number
  title: string
  description: string
  art_form: string
  level: Level
  kind: 'youtube' | 'upload' | 'placeholder'
  youtube_id: string | null
  file_url: string | null
  file_size: number | null
  mime: string | null
  is_demo: boolean
  created_at: string
  teacher: TeacherCard
}

export interface ListingItem {
  id: number
  title: string
  description: string
  art_form: string
  price_inr: number
  size: string
  materials: string
  credit: string
  is_demo: boolean
  images: string[]
  created_at: string
  craftsperson: TeacherCard
}

export interface ConversationItem {
  id: number
  other: { id: number; display_name: string; role: Role; is_demo: boolean }
  context: { type: string; id: number; title: string } | null
  last_message: string | null
  last_message_at: string
  unread: number
}

export interface DirectMessage {
  id: number
  conversation_id: number
  sender_id: number
  body: string
  created_at: string
  read: boolean
}

export const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced']
export const ART_FORM_OPTIONS = [
  ['madhubani', 'Madhubani'],
  ['warli', 'Warli'],
  ['gond', 'Gond'],
  ['pattachitra', 'Pattachitra'],
  ['kalamkari', 'Kalamkari'],
  ['pottery', 'Pottery'],
] as const

/** Art form slug -> image manifest slug for card pictures (Pattachitra has none yet). */
export const ART_IMAGE: Record<string, string | null> = {
  madhubani: 'madhubani',
  warli: 'warli',
  gond: 'gond',
  pattachitra: null,
  kalamkari: 'kalamkari',
  pottery: 'pottery',
}
