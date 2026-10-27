import { test, expect } from '@playwright/test'
import path from 'node:path'
import { analyseSample, collectProblems, expectNoHorizontalOverflow, SAMPLES, skipSplash } from './helpers'

test.beforeEach(async ({ page }) => {
  await skipSplash(page)
})

for (const [sample, name] of [
  ['warli', 'Warli'],
  ['madhubani', 'Madhubani'],
  ['gond', 'Gond'],
] as const) {
  test(`analyse the ${sample} sample as ${name}`, async ({ page }) => {
    const problems = collectProblems(page)
    await analyseSample(page, sample, name)
    await expect(page.getByRole('heading', { name: 'Analysis Results' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Style similarity' })).toBeVisible()
    await expect(page.getByText(/style-similarity estimate from a small model/i)).toBeVisible()
    await expect(page.getByRole('img', { name: /^Style similarity: \d+ percent$/ })).toBeVisible()
    await expect(page.getByText('Feature checks')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    const text = await page.locator('main').innerText()
    expect(text).not.toMatch(/\/100|overall score/i)
    expect(problems).toEqual([])
  })
}

test('Pattachitra is selectable and shows the pattern placeholder, not a fake image', async ({ page }) => {
  await page.goto('/analyse')
  await page.getByRole('button', { name: 'Use the warli sample image' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('button', { name: /Pattachitra/ })).toBeVisible()
  await page.goto('/art-forms/pattachitra')
  await expect(page.getByRole('img', { name: /coming soon/i }).first()).toBeVisible()
})

for (const [sample, name] of [
  ['kalamkari', 'Kalamkari'],
  ['pottery', 'Traditional Pottery'],
] as const) {
  test(`${name} takes the guidance-only path with no probabilities`, async ({ page }) => {
    await analyseSample(page, sample, name)
    await expect(page.getByText('Guidance only').first()).toBeVisible()
    await expect(page.getByText(/no trained classifier/i)).toBeVisible()
    await expect(page.getByText('Looks most like')).toHaveCount(0)
    await expect(page.getByRole('img', { name: /Style similarity: \d+ percent/ })).toHaveCount(0)
  })
}

test('wrong style: a Warli image submitted as Madhubani says it looks more like another style', async ({ page }) => {
  await analyseSample(page, 'warli', 'Madhubani')
  await expect(page.getByText(/more similar to/i)).toBeVisible()
})

test('junk image: no misleading style estimate', async ({ page }) => {
  await page.goto('/analyse')
  await page.getByLabel('Artwork image file').setInputFiles(path.join(SAMPLES, 'junk-text-document.png'))
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: /Warli/ }).first().click()
  await page.getByRole('button', { name: 'Analyse artwork' }).click()
  await page.waitForURL(/\/analysis\//)
  await expect(page.getByText(/does not look like a painting/i).first()).toBeVisible()
  await expect(page.getByText('Looks most like')).toHaveCount(0)
})

test('rejects bad files with the shared messages', async ({ page }) => {
  await page.goto('/analyse')
  const input = page.getByLabel('Artwork image file')
  await input.setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await expect(page.getByRole('alert')).toContainText('Unsupported file type')
  await input.setInputFiles({ name: 'empty.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(0) })
  await expect(page.getByRole('alert')).toContainText('This file is empty')
  await input.setInputFiles({ name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not really an image') })
  await expect(page.getByRole('alert')).toContainText('could not read this image')
})

test('model down (503): friendly message and a retry that works', async ({ page }) => {
  let calls = 0
  await page.route('**/api/analyze', async (route) => {
    calls += 1
    if (calls === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'model_unavailable', message: 'Analysis is temporarily unavailable. Please try again later.' } }) })
    } else {
      await route.continue()
    }
  })
  await page.goto('/analyse')
  await page.getByRole('button', { name: 'Use the warli sample image' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: /Warli/ }).first().click()
  await page.getByRole('button', { name: 'Analyse artwork' }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await page.getByRole('button', { name: /try again/i }).click()
  await page.waitForURL(/\/analysis\//)
})

test('cancel mid-analysis returns to the art form step', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await new Promise((r) => setTimeout(r, 4000))
    await route.continue().catch(() => undefined)
  })
  await page.goto('/analyse')
  await page.getByRole('button', { name: 'Use the warli sample image' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: /Warli/ }).first().click()
  await page.getByRole('button', { name: 'Analyse artwork' }).click()
  await expect(page.getByRole('progressbar', { name: 'Analysis progress' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Analyse artwork' })).toBeVisible()
  await expect(page).toHaveURL(/\/analyse/)
})

test('double-click on Analyse sends one request', async ({ page }) => {
  let posts = 0
  page.on('request', (r) => {
    if (r.url().endsWith('/api/analyze') && r.method() === 'POST') posts += 1
  })
  await page.goto('/analyse')
  await page.getByRole('button', { name: 'Use the madhubani sample image' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: /Madhubani/ }).first().click()
  await page.getByRole('button', { name: 'Analyse artwork' }).dblclick()
  await page.waitForURL(/\/analysis\//)
  expect(posts).toBe(1)
})

test('results survive a refresh, and the analysis appears in the portfolio', async ({ page }) => {
  await analyseSample(page, 'gond', 'Gond')
  const url = page.url()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Analysis Results' })).toBeVisible()
  await page.goto('/portfolio')
  await expect(page.getByText(/Style similarity \d+%|Gond/).first()).toBeVisible()
  expect(url).toMatch(/\/analysis\//)
})

test('download report uses the print stylesheet (window.print)', async ({ page }) => {
  await analyseSample(page, 'warli', 'Warli')
  await page.evaluate(() => {
    ;(window as unknown as { __printed: number }).__printed = 0
    window.print = () => {
      ;(window as unknown as { __printed: number }).__printed += 1
    }
  })
  await page.getByRole('button', { name: 'Download report' }).click()
  expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('header')).toBeHidden()
})

test('share falls back to copying the link when Web Share is missing', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined)
  await analyseSample(page, 'warli', 'Warli')
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }))
  await page.getByRole('button', { name: 'Share' }).click()
  await expect(page.getByText(/Link copied|Could not copy/)).toBeVisible()
})

test('chat: answers from notes, keeps history, explains missing voice support', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = undefined
    ;(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined
  })
  await page.goto('/chat')
  await page.getByLabel('Type your message').fill('What materials does Madhubani use?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText(/Materials and techniques/)).toBeVisible()
  await page.getByRole('button', { name: 'Voice input' }).click()
  await expect(page.getByText(/not supported in this browser/i)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Materials and techniques/)).toBeVisible()
})

test('community: sample tags, optimistic like with rollback on failure, share validation', async ({ page }) => {
  await page.goto('/community')
  await expect(page.getByText('Sample', { exact: true }).first()).toBeVisible()
  const like = page.getByRole('button', { name: /Like this post/ }).first()
  await like.click()
  await expect(page.getByRole('button', { name: /Unlike this post, 1 likes/ }).first()).toBeVisible()
  await page.route('**/api/community/*/like', (route) => route.abort())
  await page.getByRole('button', { name: /Like this post/ }).nth(1).click()
  await expect(page.getByText(/Could not save your like/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Like this post, 0 likes/ }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Share your artwork' }).click()
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText(/at least 3 characters/)).toBeVisible()
  await expect(page.getByText(/choose an art form/i)).toBeVisible()
  await page.getByLabel('Title').fill('My first Warli village')
  await page.getByLabel('Art form', { exact: true }).selectOption('warli')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText('Shared by you')).toBeVisible()
})

test('server down: pages show an error with retry', async ({ page }) => {
  await page.route('**/api/art-forms', (route) => route.abort())
  await page.goto('/art-forms')
  await expect(page.getByRole('alert')).toContainText(/Could not reach the server/)
  await page.unroute('**/api/art-forms')
  await page.getByRole('button', { name: /try again/i }).click()
  await expect(page.getByRole('heading', { name: 'Madhubani / Mithila Painting' }).or(page.getByText('Madhubani').first())).toBeVisible()
})

test('localStorage disabled: the app still works', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
  })
  await page.goto('/portfolio')
  await expect(page.getByRole('heading', { name: 'Guest' })).toBeVisible()
  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: /Chat with the Parampara coach/ })).toBeVisible()
})

test('very long note and unicode input are accepted', async ({ page }) => {
  await page.goto('/analyse')
  await page.getByRole('button', { name: 'Use the warli sample image' }).click()
  const note = page.getByLabel(/Tell us about your artwork/)
  await note.fill('وارلي '.repeat(200) + ' 🎨 ' + 'x'.repeat(2000))
  expect((await note.inputValue()).length).toBeLessThanOrEqual(500)
})
