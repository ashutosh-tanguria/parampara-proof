"""CLIP ViT-B/32 image embedding -> LogisticRegression (4 classes) + CLIP text-similarity feature signals.

No overall quality score is produced: none has been validated. Probabilities are a style-similarity estimate.
"""
import hashlib
import json
import logging
import time
from pathlib import Path

import numpy as np
from PIL import Image

from .content import AUTOMATED, hero_image

log = logging.getLogger("parampara.model")

EXPECTED_CLASSES = ["gond", "madhubani", "pattachitra", "warli"]
MODEL_FILES = ["clf.joblib", "feature_stats.json", "text_feats.json", "clip_features.json", "model_meta.json", "knowledge_base.json", "image_credits.csv"]
LOW_CONFIDENCE = 0.5
WEAK_FEATURE_Z = -0.5  # reliable feature is "weak" if its similarity is this many std below the own-class mean

# Not-a-painting guard (see docs/MODEL_CARD.md for how the threshold was calibrated).
GUARD_ART_PROMPTS = [
    "a painting", "a drawing", "a folk art painting", "a hand-painted artwork on paper or cloth",
    "a traditional Indian painting", "an illustration with patterns",
]
GUARD_OTHER_PROMPTS = [
    "a photo of a person", "a selfie", "a photo of food", "a screenshot of a phone or computer screen",
    "a scanned text document", "a landscape photograph", "a photo of a building", "a photo of an animal",
    "a blank white page", "a photo of a car", "a photo of furniture",
]
ARTWORK_THRESHOLD = 0.5


class ModelIntegrityError(RuntimeError):
    """The model files are missing, changed, or incompatible with this environment."""


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_manifest(model_dir: Path) -> dict:
    """Raise ModelIntegrityError with a clear message if the model cannot be trusted. Returns model_meta."""
    import sklearn

    missing = [n for n in MODEL_FILES if not (model_dir / n).exists()]
    if missing:
        raise ModelIntegrityError(f"Model files missing in {model_dir}: {', '.join(missing)}")
    try:
        manifest = json.loads((model_dir / "model_manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise ModelIntegrityError(f"model_manifest.json is missing or invalid: {e}") from e
    changed = [n for n in MODEL_FILES if sha256(model_dir / n) != manifest.get("files", {}).get(n)]
    if changed:
        raise ModelIntegrityError(
            f"Model files do not match model_manifest.json: {', '.join(changed)}. "
            "If you retrained on purpose, run: python scripts/verify_model.py --write"
        )
    meta = json.loads((model_dir / "model_meta.json").read_text(encoding="utf-8"))
    if sorted(meta.get("classes", [])) != EXPECTED_CLASSES:
        raise ModelIntegrityError(f"Unexpected class list {meta.get('classes')}; expected {EXPECTED_CLASSES}")
    if meta.get("sklearn_version") != sklearn.__version__:
        raise ModelIntegrityError(
            f"scikit-learn {sklearn.__version__} is installed but the model was saved with {meta.get('sklearn_version')}. "
            f"Install scikit-learn=={meta.get('sklearn_version')}."
        )
    return meta


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class Knowledge:
    """Curated content. Independent of the classifier so content pages work even if the model is down."""

    def __init__(self, model_dir: Path):
        self.kb: dict = _load_json(model_dir / "knowledge_base.json")
        self.clip_kb: dict = _load_json(model_dir / "clip_features.json")


class ModelService:
    def __init__(self, model_dir: Path, knowledge: Knowledge, check: bool = True):
        import joblib

        self.model_dir = model_dir
        self.knowledge = knowledge
        self.meta = check_manifest(model_dir) if check else _load_json(model_dir / "model_meta.json")
        self.clf = joblib.load(model_dir / "clf.joblib")
        if [str(c) for c in self.clf.classes_] != EXPECTED_CLASSES:
            raise ModelIntegrityError(f"Classifier classes are {list(self.clf.classes_)}, expected {EXPECTED_CLASSES}")
        self.feature_stats = _load_json(model_dir / "feature_stats.json")
        self.text_feats = {k: np.asarray(v, dtype=np.float32) for k, v in _load_json(model_dir / "text_feats.json").items()}
        self.clip_name = self.meta.get("clip_model", "openai/clip-vit-base-patch32")
        self.model_version = f"CLIP {self.clip_name} + LogisticRegression (sklearn {self.meta.get('sklearn_version')})"
        self._clip = None
        self._guard_text: np.ndarray | None = None

    # ---- CLIP -----------------------------------------------------------------------------------------------
    def load_clip(self, threads: int | None = None) -> None:
        import torch
        from transformers import CLIPModel, CLIPProcessor

        if threads:
            torch.set_num_threads(threads)
        t0 = time.perf_counter()
        model = CLIPModel.from_pretrained(self.clip_name).eval()
        processor = CLIPProcessor.from_pretrained(self.clip_name)
        self._clip = (model, processor, torch)
        prompts = GUARD_ART_PROMPTS + GUARD_OTHER_PROMPTS
        with torch.no_grad():
            out = model.get_text_features(**processor(text=prompts, return_tensors="pt", padding=True))
        t = self._to_tensor(out, torch).numpy().astype(np.float32)
        self._guard_text = t / (np.linalg.norm(t, axis=1, keepdims=True) + 1e-9)
        self.embed(Image.new("RGB", (64, 64), (128, 128, 128)))  # warm-up
        log.info("CLIP loaded", extra={"ms": round((time.perf_counter() - t0) * 1000)})

    @staticmethod
    def _to_tensor(out, torch):
        if torch.is_tensor(out):
            return out
        for attr in ("image_embeds", "text_embeds", "pooler_output"):
            v = getattr(out, attr, None)
            if v is not None:
                return v
        raise RuntimeError("Unexpected CLIP output type")

    @property
    def ready(self) -> bool:
        return self._clip is not None

    def embed(self, im: Image.Image) -> np.ndarray:
        if not self.ready:
            raise RuntimeError("CLIP is not loaded")
        model, proc, torch = self._clip
        with torch.no_grad():
            out = model.get_image_features(**proc(images=im, return_tensors="pt"))
        v = self._to_tensor(out, torch)[0].numpy().astype(np.float32)
        return v / (np.linalg.norm(v) + 1e-9)

    def artwork_probability(self, emb: np.ndarray) -> float:
        """Zero-shot probability that the image is a painting or drawing rather than a photo, screenshot or document."""
        logits = 100.0 * (self._guard_text @ emb)
        p = np.exp(logits - logits.max())
        p /= p.sum()
        return float(p[: len(GUARD_ART_PROMPTS)].sum())

    # ---- analysis -------------------------------------------------------------------------------------------
    def feature_status(self, emb: np.ndarray, art: str, feature_id: str) -> str:
        """present / weak for the few reliable features; 'unsure' for every unreliable one."""
        key = f"{art}/{feature_id}"
        st = self.feature_stats.get(key, {})
        if not st.get("reliable") or key not in self.text_feats:
            return "unsure"
        z = (float(emb @ self.text_feats[key]) - st["mean_own"]) / max(st["std_own"], 1e-6)
        return "present" if z >= WEAK_FEATURE_Z else "weak"

    def analyze_image(self, im: Image.Image, target: str, user_note: str | None = None) -> dict:
        target = target.lower().strip()
        if target not in AUTOMATED:
            return self.guidance_only(target, user_note)
        emb = self.embed(im)
        return self.analyze_embedding(emb, target, self.artwork_probability(emb), user_note)

    def guidance_only(self, target: str, user_note: str | None = None) -> dict:
        info = self.knowledge.kb.get(target, {})
        name = info.get("name", target.capitalize())
        checks = [
            {"id": c.get("id", ""), "title": c.get("title", ""), "status": "manual_review", "description": c.get("description", ""), "tip": c.get("tip", "")}
            for c in info.get("key_characteristics", [])
        ]
        return self._shape(
            target=target, name=name, supported=False, probs={}, predicted=None, match=0.0, looks_like_artwork=True,
            assessment=f"{name} has no trained classifier yet, so no automated analysis was run and no probabilities are shown. Use the characteristics below to review your own work.",
            comment="Automated style analysis covers Madhubani, Warli, Gond and Pattachitra only.",
            confidence_note="Not applicable: no model was run for this art form.",
            checks=checks, strengths=[], improvements=[], warnings=[], user_note=user_note, info=info,
        )

    def analyze_embedding(self, emb: np.ndarray, target: str, art_prob: float, user_note: str | None = None) -> dict:
        info = self.knowledge.kb.get(target, {})
        name = info.get("name", target.capitalize())
        probs_arr = self.clf.predict_proba([emb])[0]
        probs = {str(c): round(float(p), 4) for c, p in zip(self.clf.classes_, probs_arr)}
        top = max(probs, key=probs.get)
        match = probs.get(target, 0.0)

        if art_prob < ARTWORK_THRESHOLD:
            return self._shape(
                target=target, name=name, supported=True, probs={}, predicted=None, match=0.0, looks_like_artwork=False,
                assessment="This image does not look like a painting or drawing, so no style estimate is shown. Try a clear, well-lit picture of the artwork itself.",
                comment="", confidence_note="No style estimate was produced.", checks=[], strengths=[], improvements=[],
                warnings=[], user_note=user_note, info=info,
            )

        checks, strengths, improvements = [], [], []
        for f in self.knowledge.clip_kb.get(target, {}).get("features", []):
            fid = f.get("id", "")
            checks.append({
                "id": fid, "title": fid.replace("_", " ").title(), "status": self.feature_status(emb, target, fid),
                "description": f.get("description", ""), "tip": f.get("tip", ""),
            })
        for c in checks:
            if c["status"] == "present":
                strengths.append(f"Tentative visual signal consistent with {c['title'].lower()}: {c['description']}")
            elif c["status"] == "weak":
                improvements.append({"feature": c["title"], "issue": f"Tentative signal: {c['title'].lower()} looks weak in this image", "why_it_matters": c["description"], "fix": c["tip"]})
        for c in [c for c in checks if c["status"] == "unsure"][:2]:
            improvements.append({"feature": c["title"], "issue": "Could not be assessed automatically; check this yourself", "why_it_matters": c["description"], "fix": c["tip"]})
        if not strengths:
            strengths.append("No feature could be measured reliably enough to call out a strength.")

        warnings = []
        if top == "madhubani" or target == "madhubani":
            warnings.append("Madhubani is the model's weakest style (F1 0.49 in cross-validation), so results involving it are less reliable.")
        assessment = f"The model's closest style is {top.capitalize()} ({probs[top] * 100:.0f}%). This is a style-similarity estimate, not a judgement of quality or authenticity."
        if top != target:
            assessment += f" It differs from your selected art form ({name})."
        if probs[top] < LOW_CONFIDENCE:
            note = "Low confidence: no style reaches 50%. Treat this result with caution."
        else:
            note = "A rough estimate from a small model (about 79% accuracy in cross-validation). It can be wrong."
        return self._shape(
            target=target, name=name, supported=True, probs=probs, predicted=top, match=match, looks_like_artwork=True,
            assessment=assessment,
            comment=f"Classifier probability for {name}: {match * 100:.0f}%. These are model outputs, not measures of artistic correctness.",
            confidence_note=note, checks=checks, strengths=strengths[:3], improvements=improvements[:3], warnings=warnings,
            user_note=user_note, info=info,
        )

    def _shape(self, *, target, name, supported, probs, predicted, match, looks_like_artwork, assessment, comment,
               confidence_note, checks, strengths, improvements, warnings, user_note, info) -> dict:
        return {
            "target_art_form": target, "target_name": name, "automated_supported": supported,
            "model_version": self.model_version, "probabilities": probs, "predicted_art_form": predicted,
            "style_match_score": round(match, 4), "overall_score": None,
            "overall_assessment": assessment, "style_match_comment": comment,
            "looks_like_artwork": looks_like_artwork, "confidence_note": confidence_note, "warnings": warnings,
            "strengths": strengths, "areas_for_improvement": improvements, "feature_checks": checks,
            "next_exercise": info.get("next_exercise") or "Practise basic border patterns and single-stroke outlines of this style.",
            "reference_image_slug": hero_image(target), "user_note": user_note, "language": "English",
        }
