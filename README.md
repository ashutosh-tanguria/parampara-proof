# Parampara Proof
AI-assisted learning aid for Indian folk art. Upload a practice image, get a **predicted style category** (Madhubani / Warli / Gond / Pattachitra), tentative feature signals and curated learning guidance. It does **not** certify authenticity or artistic quality. Kalamkari and pottery are learning pages only (no model).

## Run (Windows PowerShell, Python 3.12)
```
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --port 8000      # first run downloads CLIP (~600 MB), internet needed once
cd frontend; npm ci; npm run dev          # http://localhost:5173 (proxies /api, /uploads to :8000)
```
Tests: `python -m backend.test_api` (needs torch/transformers). Typecheck: `cd frontend; npx tsc --noEmit`.

## Status (honest)
- Backend: FastAPI; CLIP + LogisticRegression in `backend/model_service.py`. Storage is in-memory/local files only.
- Chat is rule/retrieval-based, not an LLM. Community, portfolio and sample records are illustrative samples, not real users.
- Knowledge content is team-curated and not expert-reviewed. Model details/limits: `MODEL_CARD.md`.
- Code: MIT (`LICENSE`). Images/data keep their own licenses (`backend/image_credits.csv`).
