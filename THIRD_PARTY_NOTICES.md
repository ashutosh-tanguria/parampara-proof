# Third-party notices

The project's own code is MIT licensed (`LICENSE`). It depends on the following open-source software, each under its own licence. Licence names are as published by each project; check the package metadata for the exact text.

## Model
| Component | Licence |
|---|---|
| CLIP ViT-B/32 (`openai/clip-vit-base-patch32`) | MIT (OpenAI) |
| Hugging Face Transformers | Apache-2.0 |

## Python (backend)
| Package | Licence |
|---|---|
| PyTorch | BSD-3-Clause |
| scikit-learn (pinned 1.6.1) | BSD-3-Clause |
| NumPy, joblib | BSD-3-Clause |
| FastAPI, pydantic | MIT |
| uvicorn | BSD-3-Clause |
| python-multipart | Apache-2.0 |
| Pillow | MIT-CMU (HPND) |
| pytest, httpx, ruff (dev) | MIT / BSD-3-Clause / MIT |

## JavaScript (frontend)
| Package | Licence |
|---|---|
| React, React DOM, React Router | MIT |
| Vite, `@vitejs/plugin-react`, Tailwind CSS, PostCSS, Autoprefixer | MIT |
| TypeScript | Apache-2.0 |
| lucide-react | ISC |
| clsx, tailwind-merge | MIT |
| `@fontsource/playfair-display`, `@fontsource/plus-jakarta-sans` | MIT (packaging); fonts under SIL OFL 1.1 |
| Vitest, Testing Library, jsdom, ESLint, typescript-eslint | MIT |
| Playwright | Apache-2.0 |

## Data: Wikimedia Commons images (training only, not redistributed)
Per-image author and licence: `backend/image_credits.csv` (also on the `/credits` page). Required attribution applies to the CC BY and CC BY-SA images:

- CC BY-SA 4.0 (106 images), CC BY-SA 3.0 (10), CC BY-SA 2.5 (2), CC BY-SA 2.0 (2): <https://creativecommons.org/licenses/>
- CC BY 4.0 (4), CC BY 3.0 (1), CC BY 2.0 (23)
- CC0 (16), Public domain (13)
- Free Art License (2): <https://artlibre.org/>

Whether trained model weights must carry share-alike terms has not been legally reviewed (see `docs/MODEL_CARD.md`).

## Illustrations
AI-generated; see `docs/ASSET_CREDITS.md`.
