import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { collectProblems, expectImagesLoaded, expectNoHorizontalOverflow, scrollThrough, skipSplash } from './helpers'

const ROUTES: Array<[string, string]> = [
  ['home', '/'],
  ['art-forms', '/art-forms'],
  ['art-form-warli', '/art-forms/warli'],
  ['art-form-pattachitra', '/art-forms/pattachitra'],
  ['learn', '/learn'],
  ['analyse', '/analyse'],
  ['chat', '/chat'],
  ['community', '/community'],
  ['portfolio', '/portfolio'],
  ['credits', '/credits'],
  ['about', '/about'],
  ['not-found', '/this-page-does-not-exist'],
]
const WIDTHS = [360, 390, 768, 1024, 1280, 1536, 1920]
const SHOT_WIDTHS = new Set([360, 390, 768, 1280, 1920])
const OUT = path.resolve(__dirname, '..', '..', 'docs', 'screenshots')

test.describe('every route at every breakpoint', () => {
  test.skip(({ browserName }, testInfo) => testInfo.project.name !== 'desktop', 'viewport is set per test; run once')
  for (const [name, url] of ROUTES) {
    for (const width of WIDTHS) {
      test(`${name} @ ${width}px`, async ({ page }) => {
        await skipSplash(page)
        const problems = collectProblems(page)
        await page.setViewportSize({ width, height: width < 768 ? 800 : 900 })
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('h1').first()).toBeVisible()
        await scrollThrough(page)
        await expectNoHorizontalOverflow(page)
        await expectImagesLoaded(page)
        if (SHOT_WIDTHS.has(width)) {
          fs.mkdirSync(OUT, { recursive: true })
          await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: true })
        }
        expect(problems).toEqual([])
      })
    }
  }
})

test('splash shows once on a phone and not on desktop', async ({ page, browser }) => {
  test.skip(test.info().project.name !== 'mobile')
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()
  await page.getByRole('button', { name: 'Get Started' }).click()
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Preserving')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0)
  void browser
})

test('deep link on refresh and friendly 404s', async ({ page }) => {
  await skipSplash(page)
  await page.goto('/art-forms/warli')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Warli')
  await page.goto('/art-forms/not-a-real-form')
  await expect(page.getByText('We could not find that art form')).toBeVisible()
  await page.goto('/analysis/' + '0'.repeat(32))
  await expect(page.getByText('We could not find this analysis')).toBeVisible()
  await page.goto('/totally/unknown')
  await expect(page.getByText('We could not find that page')).toBeVisible()
})

test('truthfulness: banned claims never appear in the UI text', async ({ page }) => {
  await skipSplash(page)
  const banned = [/expert-verified/i, /Crafts Council/i, /78\/100/, /\/100/, /100\+ Expert/i, /Authentic Mastercraft/i, /Ananya/, /Expert Lessons/i]
  for (const [, url] of ROUTES) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    for (const rx of banned) expect(text, `${url} contains ${rx}`).not.toMatch(rx)
  }
})

test('keyboard: skip link and tab order reach the main content', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop')
  await skipSplash(page)
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('reduced motion and 200% zoom do not break the layout', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop')
  await skipSplash(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 640, height: 800 }) // 1280 px at 200% zoom
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expectNoHorizontalOverflow(page)
})
