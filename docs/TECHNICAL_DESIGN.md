# Technical design

Parampara Proof is a single web application: a React front end and a FastAPI back end that also serves the built front end. One process, one port, no database, no paid AI service.

## 1. System architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[React 19 SPA<br/>react-router, Tailwind]
        LS[(localStorage<br/>history, saved, chats)]
    end
    subgraph Server["FastAPI process (uvicorn)"]
        MW[Middleware<br/>request id, security headers,<br/>size limit, CORS]
        API[Routes<br/>/api/*]
        ST[Static: frontend/dist<br/>+ SPA fallback]
        UP[/uploads/ read-only/]
        MS[ModelService<br/>CLIP + classifier + guard]
        KB[Knowledge<br/>knowledge_base.json<br/>clip_features.json]
        MEM[(Bounded in-memory stores<br/>analyses, community posts)]
        BG[Background cleanup task<br/>TTL 24 h]
    end
    HF[(Hugging Face cache<br/>CLIP weights ~600 MB)]
    DISK[(upload dir<br/>re-encoded JPEGs)]

    UI -->|fetch / XHR| MW --> API
    UI --> LS
    MW --> ST
    API --> MS --> HF
    API --> KB
    API --> MEM
    API --> DISK
    UP --> DISK
    BG --> DISK
    BG --> MEM
```

The model files (`clf.joblib`, `feature_stats.json`, `text_feats.json`, `model_meta.json`, plus the content files) live in `backend/` and are pinned by SHA-256 in `backend/model_manifest.json`.

## 2. Request sequence: `POST /api/analyze`

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant M as Middleware
    participant A as /api/analyze
    participant U as uploads.py
    participant S as ModelService
    participant D as Upload dir / stores
    B->>B: validate file (type, 10 MB, 30 px, pixels)
    B->>M: POST multipart (XHR, shows upload progress)
    M->>M: request id, body size limit (413)
    M->>A: rate limit per IP (429)
    A->>A: art_form known? (400)
    A->>U: decode_image (threadpool)
    U-->>A: upright RGB image or 400 error
    alt model not loaded
        A-->>B: 503 model_unavailable
    else loaded
        A->>S: analyze_image (threadpool, semaphore, timeout 60 s)
        S->>S: CLIP embedding, guard, classifier, feature checks
        S-->>A: report (overall_score = null)
        A->>D: save re-encoded JPEG under random id, store report
        A-->>B: 200 report
    end
    B->>B: navigate to /analysis/:id, save to history
```

The event loop never runs inference: it is done in a worker thread, limited by a semaphore (default 2) and a timeout (504).

## 3. Model pipeline

```mermaid
flowchart TD
    IMG[Image bytes] --> DEC[Decode and normalise<br/>content-verified, EXIF, RGB, 30 px min]
    DEC --> EMB[CLIP ViT-B/32 image embedding<br/>512-d, L2-normalised]
    EMB --> GUARD{Painting-or-not guard<br/>artwork_p >= 0.5 ?}
    GUARD -- no --> NOART[looks_like_artwork = false<br/>no style estimate]
    GUARD -- yes --> LR[LogisticRegression<br/>4 probabilities]
    GUARD -- yes --> FC[Feature checker<br/>20 CLIP text prompts]
    FC --> REL{Feature reliable?<br/>4 of 20}
    REL -- yes --> PW[present / weak<br/>z-score vs own class]
    REL -- no --> UNS[unsure -> UI: Unable to assess]
    LR --> RESP[Response<br/>probabilities, style_match_score,<br/>confidence_note, warnings]
    PW --> RESP
    UNS --> RESP
    NOART --> RESP2[Response with message only]
    EMB -. Kalamkari / Pottery: not run .-> MAN[manual_review characteristics<br/>no probabilities]
```

## 4. Data and training pipeline

```mermaid
flowchart LR
    WC[Wikimedia Commons images<br/>179 collected, 132 used] --> CLEAN[Manual cleaning]
    CLEAN --> EMBT[CLIP embeddings]
    EMBT --> CV[5-fold CV and 20% hold-out]
    EMBT --> FIT[Fit LogisticRegression<br/>C=10, balanced]
    PROMPTS[clip_features.json<br/>20 prompts] --> TXT[CLIP text vectors]
    TXT --> STATS[Per-feature own/other stats<br/>reliable if gap >= 0.6 std]
    EMBT --> STATS
    FIT --> OUT[clf.joblib, feature_stats.json,<br/>text_feats.json, model_meta.json]
    STATS --> OUT
    OUT --> MAN[scripts/verify_model.py --write<br/>model_manifest.json SHA-256]
    MAN --> BACKEND[backend/ startup check]
```
`ml/train_clip_classifier.py` implements this. The original Colab notebook is not in the repository.

## 5. Deployment

```mermaid
flowchart LR
    DEV[Developer] -->|git push| CI[GitHub Actions<br/>ruff, pytest, vitest,<br/>build, Playwright]
    DEV -->|docker build| IMG[Image<br/>node build -> python:3.12-slim<br/>CPU torch, CLIP baked in,<br/>HF_HUB_OFFLINE=1]
    IMG --> HOST[Host: Hugging Face Space, Render or any Docker host<br/>>= 2 GB RAM, port 8000]
    HOST --> USER[Visitor browser]
    VOL[(Volume: /data/uploads)] --- HOST
```

## 6. Front end route and component map

```mermaid
flowchart TD
    APP[App: Splash, Navbar, MobileBottomNav, Footer, Toasts, ArtFormsProvider] --> R{react-router}
    R --> HOME[/ Home/]
    R --> AF[/art-forms Explore/] --> CARD[ArtFormCard]
    R --> AFD[/art-forms/:slug Detail: 6 tabs/]
    R --> AN[/analyse Stepper: Upload, Select, Analysis/] --> DZ[Dropzone, ProgressBar]
    R --> RES[/analysis/:id Results/] --> RV[ResultsView: StyleGauge, ProbabilityBars, feature chips, Disclaimer]
    R --> LEARN[/learn/]
    R --> CHAT[/chat/]
    R --> COM[/community/] --> MODAL[Modal share form]
    R --> PORT[/portfolio/]
    R --> CRED[/credits/]
    R --> ABOUT[/about/]
    R --> NF[* NotFound]
    CARD --> RI[ResponsiveImage -> imageManifest.ts]
    AFD --> RI
    RV --> RI
```
All routes are lazy-loaded. Shared UI: Button, Chip, Card, Badge, Tabs, Stepper, Dropzone, ProgressBar, Modal, Toast, Skeleton, EmptyState, ErrorState, SectionHeader, ResponsiveImage.

## 7. Design decisions and trade-offs

- **CLIP + logistic regression.** With 132 training images, fine-tuning a network would overfit. A frozen general image model with a linear head is cheap to train, runs on CPU, and gives usable probabilities. The cost is that it can only see what CLIP encodes and is sensitive to image style (see the model card).
- **No quality score.** No score was ever validated against human judgement, so none is produced. `overall_score` is `null` in the API; the UI shows "Style similarity" and says what it is not. This is the project's central honesty rule.
- **Feature checker shows only reliable features.** Only 4 of 20 prompts separate their own class from the others. Showing "present/missing" for the other 16 would be guessing, so they show "Unable to assess".
- **Guard before estimate.** Without it, a selfie or screenshot still gets a confident-looking style probability, because the classifier must pick one of four classes.
- **No database.** Analyses and community posts live in bounded in-memory stores and are lost on restart; uploads expire after 24 h. This keeps the prototype simple and private. A real deployment would need persistence and accounts.
- **Guest data stays in the browser** (`localStorage`), so the server never lists other people's analyses.
- **Content is served by the same process** as the API, so one container and one port serve everything; Vite's dev server proxies `/api` and `/uploads`.
- **Degraded mode.** If the model fails to load, the API still starts and serves content; `/api/analyze` returns 503 and the UI shows "analysis temporarily unavailable". Set `STRICT_MODEL_CHECK=1` (the Docker image does) to refuse to start instead.

## 8. Security and privacy design
- Uploads are validated by content (Pillow), not by name or `Content-Type`; size, dimension and pixel caps protect against decompression bombs.
- Stored images are re-encoded (EXIF/GPS dropped) under random ids; user file names never reach the disk; `/uploads` is read-only static serving.
- Auto-deletion after `UPLOAD_TTL_HOURS` (default 24) by a background task; the UI says so.
- CORS allows only `ALLOWED_ORIGINS`, credentials are off; per-IP rate limiting on `/api/analyze` and `/api/chat`; request size limit; security headers incl. CSP.
- Error responses are generic JSON; stack traces are logged server-side with a request id.
- SPA static serving resolves paths and refuses anything outside `frontend/dist`.
- No analytics, no cookies, no third-party requests at runtime (fonts are self-hosted). The only network use is the one-time CLIP download.

## 9. Performance notes
- CLIP is loaded once at startup (and warmed up), not on the first request. First start downloads about 600 MB unless the cache is pre-filled (`scripts/download_model.py`).
- Inference runs in a thread pool with `torch.set_num_threads(min(4, CPUs))`.
- Front end: route-level code splitting, hero image preloaded, other images lazy with fixed aspect ratios (no layout shift), WebP with JPEG fallback at 480/960/1600 px, self-hosted fonts with `font-display: swap`.

## 10. Testing strategy
- `pytest` (`tests/`): upload edge-case matrix, API success and error paths, stores and rate limiter, manifest checks, chat rules, and tolerant behaviour tests with the real model.
- `vitest`: components (results states, dropzone, stepper, tabs, image fallback), validation and storage helpers.
- `playwright`: end-to-end flows on desktop and mobile, per-route checks (overflow, console errors, failed requests, image loading) and screenshots.
- Details and the latest run: `docs/TEST_REPORT.md`.

## 11. Limitations
Small model and dataset; weak on Madhubani; out-of-distribution on illustrations; guard threshold calibrated on seven images; content not reviewed by artists; no accounts, persistence or moderation; English only; no real lesson videos; no Pattachitra image.
