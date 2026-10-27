# Changelog

## 1.1.0 (2026-10-27) - rebuild for submission
### Changed
- Front end rebuilt to follow the UI mockups: design tokens, reusable components, react-router with deep links and a 404 page, route-level code splitting.
- All images replaced with optimised copies built from the original illustrations (`scripts/build_images.py`); the blurry, text-baked crops from the mockups are gone.
- Honest wording throughout: "Style similarity" instead of a score, "Unable to assess" for unreliable checks, "Sample" tags on seeded content, guest profile, no fake lessons or durations.
- Backend split into modules; the model is loaded at startup; inference runs off the event loop with a concurrency limit and timeout.
- Upload validation by content (JPG/PNG/WEBP, 10 MB, 30 px, pixel cap, EXIF, colour modes, first frame), identical rules on client and server.
- Uploads are re-encoded, stored under random ids and deleted after 24 hours.

### Added
- Not-a-painting guard (`looks_like_artwork`), `confidence_note`, `warnings`.
- Model manifest with SHA-256 checks, class and scikit-learn version checks.
- `/api/credits`, `docs/` (technical design, model card, API, test report, asset credits), sample data, Dockerfile, docker-compose, CI workflow.
- Tests: pytest, vitest, Playwright.
- `ml/train_clip_classifier.py` for the CLIP pipeline.

### Removed
- The old OpenCV training script and test scripts, the seeded "78/100" analysis, the "Ananya S." profile, the named instructor and fake video durations.

## 1.0.0
First prototype generated with another tool.
