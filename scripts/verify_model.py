"""Verify (or regenerate) backend/model_manifest.json.

    python scripts/verify_model.py            # check files against the manifest
    python scripts/verify_model.py --write    # record new checksums after retraining
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "backend"
MODEL_FILES = [
    "clf.joblib",
    "feature_stats.json",
    "text_feats.json",
    "clip_features.json",
    "model_meta.json",
    "knowledge_base.json",
    "image_credits.csv",
]
EXPECTED_CLASSES = ["gond", "madhubani", "pattachitra", "warli"]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    manifest_path = MODEL_DIR / "model_manifest.json"
    current = {n: sha256(MODEL_DIR / n) for n in MODEL_FILES if (MODEL_DIR / n).exists()}
    if args.write:
        meta = json.loads((MODEL_DIR / "model_meta.json").read_text(encoding="utf-8"))
        manifest = {"classes": meta["classes"], "sklearn_version": meta["sklearn_version"], "files": current}
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print("wrote", manifest_path)
        return 0
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    bad = [n for n in MODEL_FILES if current.get(n) != manifest["files"].get(n)]
    if bad:
        print("MISMATCH:", ", ".join(bad))
        return 1
    print("OK: %d files match the manifest" % len(current))
    return 0


if __name__ == "__main__":
    sys.exit(main())
