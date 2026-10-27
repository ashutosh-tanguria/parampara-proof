# Test report

Date of runs: 2026-10-27. Machine: Windows 11, Python 3.12, Node 24. Only results actually seen are listed.

## Summary

| Check | Result | Notes |
|---|---|---|
| `pytest` (backend) | **80 passed, 1 expected failure** (xfail) | Full run. The xfail is `test_gond_sample_is_recognised_as_gond`: the model ranks the AI-generated Gond sample as Madhubani (a known domain-shift miss, see `sample_data/README.md`). |
| `pytest tests/test_units.py` after adding the quote-attribution test | 17 passed | Only this file was re-run after the last backend edit. The full suite was **not** re-run after it. |
| `vitest` (frontend) | **30 passed** | Run before the last navigation and chat CSS edits; not re-run since. |
| `tsc --noEmit` (typecheck) | clean | Last run after the navigation, chat and e2e edits. |
| `eslint` | clean | Last run before the navigation, chat and e2e edits; **not re-run since**. |
| `ruff check` (Python) | clean | Last run before the quote-attribution edit; not re-run since. |
| `npm run build` | succeeded | Last build after the navigation and chat edits. |
| Playwright e2e | **ran: 130 passed, 1 failed, 87 skipped** | The failure is not yet triaged (see below). The skips are by design: the per-breakpoint block runs on the desktop project only. |
| Lighthouse | **not verified** | Not run. |
| Docker build and `docker compose up` | **not verified** | Docker is not installed on this machine. |
| Fresh-clone test from the README | **not verified** | Not run. |

## Backend tests (`tests/`)
- `test_uploads.py`: wrong types (text renamed .jpg, PDF, SVG, GIF), 0-byte file, over-size, corrupt and truncated images, 29 px vs 30 px, 20000x20000 decompression bomb, grayscale/palette/CMYK/alpha conversion, EXIF rotation, animated WebP first frame, and that the client and server messages are identical.
- `test_api_content.py`: health when the model is absent, six art forms including Pattachitra, unknown/mixed-case slugs, JSON 404s, no fake lesson data, credits as plain text, community samples and likes, share validation, upload rejection codes, weird and very long file names, 503 when the model is unavailable, rate limit (429), health during parallel uploads, security headers, CORS, SPA fallback and path traversal.
- `test_units.py`: bounded stores (thread safety, eviction, TTL), rate limiter, upload TTL cleanup, chat rules (empty, long, non-English, unknown art form), model manifest checks (missing file, changed file, wrong classes, wrong scikit-learn version), quote attribution stripping.
- `test_model.py` (real CLIP model): probability distributions, only the 4 reliable features are `present`/`weak`, schema and `overall_score is None`, guidance-only forms never return probabilities, low-confidence note, guard separates junk from paintings (7 images only), tolerant behaviour checks (Warli sample ranks Warli first; Madhubani in top 2; a wrong-style submission scores lower than the correct one), health payload snapshot, end-to-end analyze with random-id storage, duplicate uploads, concurrency, and the inference timeout (504).

## Frontend tests
- `vitest` (`src/test/`): results rendering for every feature status, "Style similarity" wording and no "/100", low-confidence warning below 50%, differing-style message, not-artwork message, guidance-only, expired-image message, `ResponsiveImage` (sources, alt, hero priority, fallback, null slug), dropzone, stepper, tabs keyboard navigation, error and empty states, client validation, storage that throws, API error shapes and timeout.
- `playwright` (`frontend/e2e/`): every route at 360, 390, 768, 1024, 1280, 1536 and 1920 px (no horizontal overflow, no console errors, no failed requests, images loaded; screenshots at 360/390/768/1280/1920 in `docs/screenshots/`), upload flows for Warli, Madhubani and Gond, Pattachitra placeholder, Kalamkari and pottery guidance, wrong style, junk image, bad files, 503 with retry, cancel, double click, refresh on a results URL, print, share fallback, chat with no voice support, community, server down, localStorage disabled, long unicode notes, banned-claim scan, skip link, reduced motion.

## Playwright failure (not yet triaged)
`flows.spec.ts` "community: sample tags, optimistic like with rollback on failure, share validation" failed on the **mobile** project: `getByText('Shared by you')` matched two posts. The desktop project passed. The likely cause is that the desktop run had already added a post to the server's in-memory store (both projects share one server), so the test's locator is not specific enough. This looks like a test-isolation problem, not an app bug, but that has not been confirmed.

An earlier e2e run found real layout bugs (horizontal overflow of 15 px at 768 px on every page because of the desktop navigation, 2 px at 360 px on the chat page, and a 404 page with no `h1`). They were fixed and the later run passed those checks.

## Findings about the model (from running it)
- On the team's illustrations the classifier recognised Warli (70 to 88%) but ranked Madhubani images as Pattachitra (about 55%) and the Gond image as Madhubani (54%). See `docs/MODEL_CARD.md`.
- The not-a-painting guard separated the 5 illustrations (0.84 to 1.00) from 2 junk images (0.003 and 0.027) with threshold 0.5. This is a very small sample.

## Not verified
Lighthouse scores (performance, accessibility, best practices, SEO); `docker build` and `docker compose up`; a fresh clone following the README; the contrast ratios beyond the two computed by hand; the screenshots were produced but not visually compared against `UI_1.jpeg` and `UI_2.jpeg`; the e2e failure above.
