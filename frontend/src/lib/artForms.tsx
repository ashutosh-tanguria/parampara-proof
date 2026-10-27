import { createContext, useContext, type ReactNode } from 'react'
import { useApi, type ApiState } from './hooks'
import type { ArtFormSummary } from '../types'

const Ctx = createContext<ApiState<{ art_forms: ArtFormSummary[] }> | null>(null)

/** One shared fetch of the art form catalogue for every page. */
export function ArtFormsProvider({ children }: { children: ReactNode }) {
  const state = useApi<{ art_forms: ArtFormSummary[] }>('/api/art-forms')
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useArtForms() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useArtForms must be used inside ArtFormsProvider')
  return { ...v, forms: v.data?.art_forms ?? [] }
}

/** Slug of the image used as an analysis sample thumbnail for each art form. */
export const SAMPLE_THUMBS: Record<string, string> = {
  warli: 'warli-brushes',
  madhubani: 'madhubani',
  gond: 'gond',
  kalamkari: 'kalamkari',
  pottery: 'pottery',
}
