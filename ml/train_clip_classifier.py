"""Reproduce the Parampara Proof classifier from a folder of images.

Input layout (not shipped; see docs/MODEL_CARD.md for the data sources):
    data/<art_form>/*.jpg        art_form in madhubani, warli, gond, pattachitra

Pipeline: CLIP ViT-B/32 image embedding (L2-normalised) -> LogisticRegression.
Outputs (same files the backend loads) go to --out (default: ./model_out):
    clf.joblib, feature_stats.json, text_feats.json, model_meta.json,
    clip_features.json (copied), cv_report.json (5-fold CV and hold-out metrics)

    python ml/train_clip_classifier.py --data data --out model_out

After checking the metrics, copy the files into backend/ and run
`python scripts/verify_model.py --write` to record new checksums.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import joblib
import numpy as np
import sklearn
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split

CLIP_NAME = "openai/clip-vit-base-patch32"
ARTS = ["madhubani", "warli", "gond", "pattachitra"]
RELIABLE_GAP_STD = 0.6  # a feature is "reliable" if its own-class mean is >= 0.6 std above other classes
SEED = 42
ROOT = Path(__file__).resolve().parent.parent


def load_clip():
    import torch
    from transformers import CLIPModel, CLIPProcessor

    model = CLIPModel.from_pretrained(CLIP_NAME).eval()
    return model, CLIPProcessor.from_pretrained(CLIP_NAME), torch


def _tensor(out, torch):
    if torch.is_tensor(out):
        return out
    emb = getattr(out, "image_embeds", None)
    if emb is None:
        emb = getattr(out, "text_embeds", None)
    return emb if emb is not None else out.pooler_output


def embed_images(paths, clip):
    model, proc, torch = clip
    vecs = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        with torch.no_grad():
            out = model.get_image_features(**proc(images=im, return_tensors="pt"))
        v = _tensor(out, torch)[0].numpy().astype(np.float32)
        vecs.append(v / (np.linalg.norm(v) + 1e-9))
    return np.stack(vecs)


def embed_texts(prompts, clip):
    model, proc, torch = clip
    vecs = []
    for t in prompts:
        with torch.no_grad():
            out = model.get_text_features(**proc(text=[t], return_tensors="pt", padding=True))
        v = _tensor(out, torch)[0].numpy().astype(np.float32)
        vecs.append(v / (np.linalg.norm(v) + 1e-9))
    return np.stack(vecs)


def make_classifier():
    return LogisticRegression(max_iter=2000, C=1.0)


def feature_stats(X, y, classes, clip_features, clip):
    """Per-feature own/other similarity statistics and the reliability flag."""
    stats, text_feats = {}, {}
    for art in ARTS:
        feats = clip_features.get(art, {}).get("features", [])
        if not feats:
            continue
        T = embed_texts([f["prompt"] for f in feats], clip)
        own = np.array([c == art for c in classes])[y]
        for f, t in zip(feats, T):
            key = "%s/%s" % (art, f["id"])
            sims = X @ t
            a, b = sims[own], sims[~own]
            gap = (a.mean() - b.mean()) / max(a.std(), 1e-6)
            stats[key] = {
                "mean_own": float(a.mean()), "std_own": float(a.std()), "mean_other": float(b.mean()),
                "gap_in_std": round(float(gap), 2), "reliable": bool(gap >= RELIABLE_GAP_STD),
            }
            text_feats[key] = t.tolist()
    return stats, text_feats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--out", default="model_out")
    ap.add_argument("--features", default=str(ROOT / "backend" / "clip_features.json"))
    args = ap.parse_args()

    data, out = Path(args.data), Path(args.out)
    paths, labels = [], []
    for art in ARTS:
        files = sorted(p for p in (data / art).glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
        if not files:
            sys.exit("No images found in %s" % (data / art))
        paths += files
        labels += [art] * len(files)
    counts = {a: labels.count(a) for a in ARTS}
    print("images per class:", counts)

    clip = load_clip()
    X = embed_images(paths, clip)
    classes = sorted(ARTS)
    y = np.array([classes.index(l) for l in labels])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    pred = cross_val_predict(make_classifier(), X, y, cv=cv)
    cv_rep = classification_report(y, pred, target_names=classes, output_dict=True)
    print("5-fold CV accuracy: %.3f" % cv_rep["accuracy"])

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
    hold = make_classifier().fit(Xtr, ytr)
    hold_rep = classification_report(yte, hold.predict(Xte), target_names=classes, output_dict=True)
    print("20%% hold-out accuracy: %.3f (n=%d)" % (hold_rep["accuracy"], len(yte)))

    clf = make_classifier().fit(X, y)
    clf.classes_ = np.array(classes)  # the backend expects the class names, not indices
    clip_features = json.loads(Path(args.features).read_text(encoding="utf-8"))
    stats, text_feats = feature_stats(X, y, classes, clip_features, clip)

    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, out / "clf.joblib")
    (out / "feature_stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    (out / "text_feats.json").write_text(json.dumps(text_feats), encoding="utf-8")
    (out / "model_meta.json").write_text(json.dumps(
        {"clip_model": CLIP_NAME, "classes": classes, "arts": ARTS, "sklearn_version": sklearn.__version__}, indent=2),
        encoding="utf-8")
    shutil.copy(args.features, out / "clip_features.json")
    (out / "cv_report.json").write_text(json.dumps(
        {"counts": counts, "cv5": cv_rep, "holdout20": hold_rep}, indent=2), encoding="utf-8")
    print("reliable features:", [k for k, v in stats.items() if v["reliable"]])
    print("wrote", out)


if __name__ == "__main__":
    main()
