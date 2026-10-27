import { expect, type Page } from '@playwright/test'
import path from 'node:path'

export const SAMPLES = path.resolve(import.meta.dirname, '..', '..', 'sample_data')

/** Skip the first-visit splash so tests start on the real page. */
export async function skipSplash(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pp_seen_splash', 'true')
    } catch {
      /* ignore */
    }
  })
}

export function collectProblems(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('/api/analysis/')) problems.push(`HTTP ${r.status()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => problems.push(`request failed ${r.url()} ${r.failure()?.errorText}`))
  return problems
}

/** Scroll the whole page so lazy images load, then return to the top. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0)
}

export async function expectImagesLoaded(page: Page) {
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((i) => i.offsetParent !== null || i.getBoundingClientRect().width > 0)
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src),
  )
  expect(broken, 'images that did not load').toEqual([])
}

/** Walk the Analyse flow with a bundled sample image. */
export async function analyseSample(page: Page, sample: string, artFormName: string) {
  await page.goto('/analyse')
  await page.getByRole('button', { name: `Use the ${sample} sample image` }).click()
  await expect(page.getByAltText('Preview of your uploaded artwork')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(artFormName, 'i') }).first().click()
  await page.getByRole('button', { name: 'Analyse artwork' }).click()
  await page.waitForURL(/\/analysis\/[0-9a-f]{32}/)
}
