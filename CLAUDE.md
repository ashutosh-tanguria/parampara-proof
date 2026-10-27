# CLAUDE.md: Parampara Proof

Project memory for Claude Code. Read this first in every session. Keep it up to date when the structure or rules change.

## What this project is
Parampara Proof is a web platform for learning traditional Indian folk art (Madhubani, Warli, Gond, Pattachitra, plus guidance-only Kalamkari and Pottery). A learner uploads a painting and gets a style-similarity estimate, per-feature signals and tips. It is a competition prototype, and the code must be open-source ready.

Team: Ashutosh Tanguria, Prithika Banerjee, Shreesh Tripathi (IIT Kharagpur).

## Stack
- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS 3, lucide-react (folder `frontend/`).
- Backend: FastAPI, scikit-learn 1.6.1 (pinned, must match the saved model), PyTorch + Transformers for CLIP (folder `backend/`).
- Model: CLIP ViT-B/32 image embeddings -> LogisticRegression (4 classes) + CLIP text-similarity feature checker. Files live in `backend/` (`clf.joblib`, `feature_stats.json`, `text_feats.json`, `clip_features.json`, `model_meta.json`, `knowledge_base.json`, `image_credits.csv`).
- No paid AI API anywhere. Do not add one.

## Commands (keep these working; update here if they change)
- Backend dev: `uvicorn backend.main:app --reload --port 8000` (run from the repo root)
- Frontend dev: `cd frontend && npm install && npm run dev` (Vite on 5173, proxies /api to 8000)
- Backend tests: `pytest -q`
- Frontend checks: `cd frontend && npm run typecheck && npm run lint && npm test && npm run build`
- E2E: `cd frontend && npx playwright test`

## Hard rules (never break these)
1. **Honesty over polish.** The model gives a style-similarity estimate. It must never be presented as a quality score, an authenticity certificate or an "expert" judgement. `overall_score` stays `null`. No fake numbers, fake testimonials, fake artist names or "expert-verified" claims anywhere in the UI, README or docs.
2. Only 4 of 20 feature checks are reliable. Unreliable ones must show as "unable to assess", never as present/missing.
3. Seeded demo content (community posts, portfolio items) must be visibly labelled "Sample".
4. Images: never crop images out of UI mockups or screenshots. Use the original photos from `design-source/pictures/` and crop with CSS (`object-fit`, `object-position`) or a build script that starts from the originals.
5. Illustrations that are AI-generated must be disclosed on the Credits page. Wikimedia reference images must show author and licence.
6. Everything user-facing and all docs are in English.
7. Do not commit `node_modules/`, `dist/`, `__pycache__/`, `.env`, or `backend/uploads/`.
8. Do not delete anything in `design-source/` and never overwrite the model files without recording a new checksum in `backend/model_manifest.json`.

## Layout (target)
```
backend/            FastAPI app, model service, model files, tests
frontend/           React app (src/, public/assets/ = optimised images only)
design-source/      Original photos + UI mockups (source of truth, not shipped)
scripts/            build_images.py, verify_model.py, etc.
docs/               TECHNICAL_DESIGN.md, MODEL_CARD.md, API.md, ASSET_CREDITS.md
sample_data/        Sample images + expected results for tests and reviewers
ml/                 Training notebook + reproducible training script
tests/              Backend tests (pytest)
```

## Definition of done for any change
Typecheck, lint, tests and build pass; the page looks right at 360, 768 and 1280 px wide; no console errors; the README is still accurate.