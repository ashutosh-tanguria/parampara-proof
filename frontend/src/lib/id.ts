let counter = 0

/** Short unique id for client-side list items (not security sensitive). */
export function uid(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
}
