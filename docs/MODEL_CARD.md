# Model card: Parampara Proof style classifier

## Summary
A small classifier that says which of four Indian folk art styles an image most resembles: **Madhubani, Warli, Gond, Pattachitra**. It outputs class probabilities. These are a **style-similarity estimate**. They are not a quality score, a grade, a measure of skill, or a certificate of authenticity. Kalamkari and pottery have **no** model.

## Intended use
- Learners who want a rough second opinion on which style their practice painting resembles, together with practice tips.
- Not for: judging, ranking or certifying artworks or artists; selling or authenticating art; any decision that affects a person.

## Pipeline
1. Image -> upright RGB (EXIF applied, first frame of animations, alpha flattened on white).
2. CLIP `openai/clip-vit-base-patch32` image embedding (512 numbers, L2-normalised).
3. scikit-learn `LogisticRegression(C=10, class_weight="balanced", max_iter=3000)` -> four probabilities (`backend/clf.joblib`, saved with scikit-learn 1.6.1, which must be installed).
4. **Feature checker:** CLIP text-similarity against 20 short prompts (`backend/clip_features.json`, vectors in `text_feats.json`), compared with the same-class mean and standard deviation (`feature_stats.json`).
5. **Not-a-painting guard** (zero-shot, see below).

## Data
- 179 images were collected from Wikimedia Commons (Warli 52, Madhubani 46, Gond 44, Pattachitra 37). Per-image title, author and licence: `backend/image_credits.csv`, shown on the app's Credits page.
- After cleaning, **132 images** were used for training: Madhubani 30, Warli 41, Gond 33, Pattachitra 28. The credits file does not record which 132 were kept.
- Licences in the credits file: CC BY-SA 4.0 (106), CC BY 2.0 (23), CC0 (16), Public domain (13), CC BY-SA 3.0 (10), CC BY 4.0 (4), CC BY-SA 2.0 (2), CC BY-SA 2.5 (2), Free Art License (2), CC BY 3.0 (1). Attribution is required for CC BY and CC BY-SA.
- The training images are not redistributed in this repository.

## Metrics (reported by the team from the Colab run)
The Colab notebook is not in this repository, so these figures could not be re-run here. `ml/train_clip_classifier.py` re-implements the pipeline but has not been checked against the original data.

| Measure | Value |
|---|---|
| 5-fold cross-validation accuracy | **79%** |
| Hold-out accuracy (separate 20%, 27 images) | **78%** |
| F1 per class (cross-validation) | Gond 0.90, Warli 0.85, Pattachitra 0.85, **Madhubani 0.49 (weak)** |

With so few images these numbers are uncertain: the hold-out set is 27 images, so one image changes it by about 4 points.

## Feature checker
Twenty prompts (6 Madhubani, 5 Warli, 4 Gond, 5 Pattachitra). A prompt is "reliable" only if its similarity is at least 0.6 standard deviations higher for its own class than for the others. **Only 4 of 20 pass**: Warli white-on-earth, Warli geometric figures, Warli circle dance, Pattachitra big eyes. Every Madhubani and Gond check is unreliable. The API returns status `unsure` for them and the UI shows **"Unable to assess"**. For the 4 reliable checks the status is `present` or `weak`, still tentative.

## Not-a-painting guard
A CLIP zero-shot comparison of 6 "painting or drawing" prompts against 11 prompts for photos, screenshots, documents and blank pages (`GUARD_*` in `backend/model_service.py`). The probability mass on the painting prompts is `artwork_p`. If `artwork_p < 0.5`, the API returns `looks_like_artwork: false` and no style estimate.

Calibration (`python scripts/calibrate_guard.py`, 2026-10-27) on the 7 files in `sample_data/`: the five illustrations scored 0.84 to 1.00; the blank page scored 0.027 and the text document 0.003. Any threshold between 0.03 and 0.83 separates them, so 0.5 was kept. **This is a very small check**; it has not been tested on selfies, food, landscapes or photos of paintings in real conditions, and will have false positives and negatives.

## Known failure modes
- **Madhubani confusion.** Weakest class. On the team's Madhubani illustrations the model ranks Pattachitra first (about 55%) and Madhubani second (about 35%).
- **Domain shift.** The model learned from photographs of finished artworks. On the team's AI-generated illustrations it recognises Warli (70 to 88%) but not Gond: the Gond sample gets Gond 14%, Madhubani 54%. Treat results on illustrations, scans, screenshots or very different photography with extra caution.
- **Finished-art bias.** Beginner drawings, sketches and unfinished work may not resemble the reference photographs at all and can land on any class.
- **Mixed styles and collages** have no single right answer. Pottery and textile images are out of scope for the classifier.
- **Low confidence.** If no class reaches 50%, the UI shows a low-confidence warning.
- The four classes are exhaustive: every image is forced into one of them.

## Ethical considerations
- The knowledge content and tips were written by the team and **have not been reviewed by traditional artists**. These art forms belong to living communities; the app should not be used to judge or devalue their work.
- Wikimedia CC BY-SA images were used for training. Whether the resulting weights are bound by share-alike terms has **not been legally reviewed**; the team should check before any commercial use.
- Uploaded images are stored under random names for at most 24 hours (configurable) and are not used for training.
- The app shows illustrations that are AI-generated and says so on the Credits page.

## How to retrain
1. Put the images in `data/<art_form>/*.jpg` (madhubani, warli, gond, pattachitra).
2. `python ml/train_clip_classifier.py --data data --out model_out` (downloads CLIP on first use). It prints cross-validation and hold-out metrics and writes `clf.joblib`, `feature_stats.json`, `text_feats.json`, `model_meta.json`, `clip_features.json` and `cv_report.json`.
3. Check the metrics. Copy the files into `backend/` and run `python scripts/verify_model.py --write` to record new SHA-256 checksums in `backend/model_manifest.json`.
4. Re-run `python scripts/calibrate_guard.py` and `pytest`; update this card with the new numbers.

scikit-learn must stay pinned to the version in `model_meta.json`. The API checks the manifest, the class list and the scikit-learn version at startup.
