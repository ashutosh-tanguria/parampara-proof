# Sample data

Images for trying the app and for the automated tests. `expected_results.json` records the tolerant expectations the tests use.

| File | What it is | Source and licence |
|---|---|---|
| `sample-warli.jpg` | Warli-style painting | AI-generated illustration supplied by the team (resized to 960 px wide from `design-source/pictures`) |
| `sample-madhubani.jpg` | Madhubani-style painting | same |
| `sample-gond.jpg` | Gond-style painting | same; source of the original is not documented |
| `sample-kalamkari.jpg` | Kalamkari-style textile (guidance only, no classifier) | same |
| `sample-pottery.jpg` | Painted pottery (guidance only, no classifier) | same |
| `junk-blank.jpg` | A blank white page, created by `scripts/build_images.py` | public domain (generated) |
| `junk-text-document.png` | Rendered lines of text, created by `scripts/build_images.py` | public domain (generated) |

The illustrations are not photographs of real artworks. They are the team's own material and may be redistributed with this repository under the same licence terms as the code unless the team decides otherwise (see `docs/ASSET_CREDITS.md`).

## What to expect (honest)

- The Warli sample is recognised as Warli (about 74%).
- The Madhubani sample is ranked Pattachitra first and Madhubani second. Madhubani is the model's weakest style.
- The Gond sample is **not** recognised (Gond is ranked third). The classifier was trained on photographs from Wikimedia Commons, and these AI-generated illustrations look different from them. This is a real limitation, not a bug in the app.
- Kalamkari and pottery have no classifier. You get guidance, never probabilities.
- The two junk images should get "does not look like a painting" and no style estimate.

Regenerate the files with `python scripts/build_images.py`. Re-measure the model on them with `python scripts/calibrate_guard.py`.
