# API reference

Base URL: the same origin as the site (`http://localhost:8000` in production mode, proxied from Vite in development). All responses are JSON. Interactive docs: `/docs`.

## Error shape
Every error, including 404 and validation errors, looks like this. Stack traces are never sent to clients (they go to the server log with the request id).

```json
{ "error": { "code": "model_unavailable", "message": "Analysis is temporarily unavailable. Please try again later." } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_request` | Missing field or wrong type |
| 400 | `art_form_required`, `unknown_art_form` | `art_form` missing or not one of the six slugs |
| 400 | `empty_file`, `file_too_large`, `unsupported_type`, `unreadable_image`, `image_too_small`, `too_many_pixels` | Upload checks (below) |
| 404 | `not_found`, `art_form_not_found`, `analysis_not_found`, `post_not_found` | Unknown route or id (analysis ids expire after 24 h) |
| 413 | `request_too_large` | Request body more than about 11 MB |
| 429 | `rate_limited` | Too many requests; `Retry-After` header set |
| 503 | `model_unavailable` | The model did not load |
| 504 | `timeout` | Inference took longer than `ANALYZE_TIMEOUT_S` |
| 500 | `internal_error` | Unexpected; see server log |

Every response has an `X-Request-ID` header (send your own to correlate logs).

## Endpoints

### `GET /api/health`
```json
{ "status": "ok", "version": "1.1.0", "model_loaded": true, "clip_model": "openai/clip-vit-base-patch32",
  "sklearn_version": "1.6.1", "classes": ["gond","madhubani","pattachitra","warli"],
  "model_version": "CLIP openai/clip-vit-base-patch32 + LogisticRegression (sklearn 1.6.1)", "error": null }
```
`status` is `"degraded"` with `model_loaded: false` and an `error` text if the model could not load. The API still serves content.

### `GET /api/art-forms`
`{"art_forms": [{"slug","name","subtitle","category","image_slug","automated_supported","origin","quote","overview"}]}`. Six entries. `image_slug` is a key into the frontend image manifest, or `null` (Pattachitra: no image yet).

### `GET /api/art-forms/{slug}`
Slug is case-insensitive. Adds `key_characteristics[]` (`id,title,description,tip`), `materials_and_techniques[]`, `common_mistakes[]`, `next_exercise`, `gallery[]` (`{title,image_slug}`; may be empty). Unknown slug: 404 `art_form_not_found`.

### `GET /api/lessons`
`{"lessons":[{"id","title","art_form","summary","status":"coming_soon"}], "common_mistakes":[...], "practice_exercises":[...], "tips":[...]}`. There are no videos, durations or instructors.

### `POST /api/analyze` (multipart/form-data)
Fields: `image` (file, required), `art_form` (slug, required), `user_note` (optional, 500 chars max), `language` (ignored; always English).

Upload rules (identical on the client, `frontend/src/lib/validate.ts`): JPG, PNG or WEBP **verified by content** (the file name and `Content-Type` are not trusted); at most 10 MB; shortest side at least 30 px (224 px or more recommended); at most 40 megapixels; EXIF rotation applied; CMYK, greyscale, palette and alpha converted to RGB (alpha flattened on white); animated WEBP/APNG uses the first frame; corrupt or truncated files get a 400. The stored copy is re-encoded (metadata dropped) under a random id; the original file name is never used.

Example response (`overall_score` is always `null`):
```json
{
  "id": "3f2c...32 hex", "image_url": "/uploads/3f2c....jpg", "created_at": "2026-10-27T15:04:05Z",
  "target_art_form": "warli", "target_name": "Warli Painting", "automated_supported": true,
  "model_version": "CLIP openai/clip-vit-base-patch32 + LogisticRegression (sklearn 1.6.1)",
  "probabilities": {"gond": 0.01, "madhubani": 0.10, "pattachitra": 0.16, "warli": 0.74},
  "predicted_art_form": "warli", "style_match_score": 0.74, "overall_score": null,
  "overall_assessment": "The model's closest style is Warli (74%). This is a style-similarity estimate, not a judgement of quality or authenticity.",
  "style_match_comment": "Classifier probability for Warli Painting: 74%. These are model outputs, not measures of artistic correctness.",
  "looks_like_artwork": true,
  "confidence_note": "A rough estimate from a small model (about 79% accuracy in cross-validation). It can be wrong.",
  "warnings": [],
  "strengths": ["Tentative visual signal consistent with ..."],
  "areas_for_improvement": [{"feature","issue","why_it_matters","fix"}],
  "feature_checks": [{"id","title","status":"present|weak|unsure|manual_review","description","tip"}],
  "next_exercise": "...", "reference_image_slug": "warli", "user_note": null, "language": "English"
}
```
- `style_match_score` is the model's probability for the **chosen** style, 0 to 1. Show it as "Style similarity", never as a score out of 100.
- `unsure` = the check is not reliable; show "Unable to assess". Only 4 of 20 checks can be `present` or `weak`.
- If `looks_like_artwork` is `false` (the image looks like a photo, screenshot, document or blank page): `probabilities` is `{}`, `predicted_art_form` is `null`, no feature checks. Show `overall_assessment` instead of an estimate.
- Kalamkari and pottery: `automated_supported: false`, `probabilities: {}`, `predicted_art_form: null`, every check has status `manual_review`. No probabilities are ever invented.
- `confidence_note` starts with "Low confidence" when no class reaches 50%.

### `GET /api/analysis/{id}`
The same object as above. Unknown, malformed or expired id: 404 `analysis_not_found`. Records are bounded (500) and deleted after `UPLOAD_TTL_HOURS`.

### `GET /uploads/{id}.jpg`
The stored, re-encoded image. Deleted after the TTL.

### `POST /api/chat` (JSON)
Request `{"message": "...", "art_form": "warli"|null}` (`art_form` is an optional hint from earlier in the conversation). Message is truncated to 500 characters. Response `{"response","art_form","art_name","suggestions":[],"references":["image_slug"]}`. Answers come only from `knowledge_base.json`. Empty, non-English and unknown-art-form messages get a short, polite reply (HTTP 200).

### `GET /api/community`
`{"artworks":[{"id","title","art_form","artist","image_slug","image_url","created_at","likes","comments","is_sample"}]}`, newest first. Seed posts have `is_sample: true`. Bounded to 200 posts in memory; restarting the server clears user posts.

### `POST /api/community/{id}/like` (JSON, optional)
Body `{"liked": true|false}` (default true) adds or removes one like. Returns `{"id","likes"}`. Likes are not tied to accounts, so counts are not abuse-proof.

### `POST /api/artworks` (JSON, 201)
`{"title" (3-80 chars), "art_form", "analysis_id" (optional)}`. Attaches the image of one of your own recent analyses if given. The artist is always "Guest".

### `GET /api/portfolio`
`{"user":{"name":"Guest","bio":"..."},"storage":"browser"}`. A guest's history and saved items live in the browser (`localStorage`); the server never lists other people's analyses.

### `GET /api/credits`
`{"credits":[{"title","source_url","license","author","art"}], "note": "..."}`. From `backend/image_credits.csv` with author HTML reduced to plain text.

## Limits and headers
Rate limit: `RATE_LIMIT_PER_MIN` requests per minute per IP on `/api/analyze` and `/api/chat` (0 disables). CORS only allows `ALLOWED_ORIGINS` (never `*`). Responses carry `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and a `Content-Security-Policy` (`FRAME_ANCESTORS` controls embedding).

## Changes from the first version
`image` URLs became `image_slug` keys; `reference_artwork` became `reference_image_slug`; `reference_gallery` became `gallery`; `/api/portfolio` no longer returns analyses; `/api/credits` and `like` bodies are new; the seeded sample analysis and "Ananya S." were removed. New response fields: `looks_like_artwork`, `confidence_note`, `warnings`.
