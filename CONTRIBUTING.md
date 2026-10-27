# Contributing

Thanks for helping. Please read `CLAUDE.md` first: it lists the rules this project never breaks.

## The short version
1. **Be honest in the UI and docs.** The model gives a style-similarity estimate. Never present it as a quality score, an authenticity check or an expert opinion. `overall_score` stays `null`. Unreliable feature checks stay "Unable to assess".
2. **Images:** never crop from UI mockups; use originals in `design-source/pictures/` and run `python scripts/build_images.py`. Say when an image is AI-generated.
3. **Model files:** do not overwrite them without retraining notes and a new checksum (`python scripts/verify_model.py --write`). Keep scikit-learn at 1.6.1 unless you retrain.
4. Everything user-facing is in English.

## Set up
See the README. Short form: create a venv, `pip install torch --index-url https://download.pytorch.org/whl/cpu`, `pip install -r requirements-dev.txt`, then `cd frontend && npm install`.

## Before you open a pull request
```
ruff check backend scripts ml tests
pytest
cd frontend && npm run check       # typecheck, lint, vitest, build
npx playwright test                # needs the built frontend and the model
```
Keep changes small. Add or update tests, and update `README.md` and `docs/` if behaviour changes. Run the page at 360, 768 and 1280 px and check there are no console errors.

## Reporting problems
Open an issue with what you did, what you expected, and what happened (include the `X-Request-ID` response header if the API failed).
