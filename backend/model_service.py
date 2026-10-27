import os, io, json, joblib, numpy as np
from PIL import Image

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
SUPPORTED = ("madhubani", "warli", "gond", "pattachitra")


class ModelService:
    """CLIP ViT-B/32 image embedding -> LogisticRegression (4 classes) + CLIP text-similarity feature signals.
    No overall quality score is produced: none has been validated."""
    _instance = None

    def __init__(self):
        p = lambda n: os.path.join(MODEL_DIR, n)
        load = lambda n: json.load(open(p(n), encoding="utf-8")) if os.path.exists(p(n)) else {}
        self.meta = load("model_meta.json")
        self.clf = joblib.load(p("clf.joblib")) if os.path.exists(p("clf.joblib")) else None
        self.feature_stats = load("feature_stats.json")
        self.text_feats = {k: np.asarray(v, dtype=np.float32) for k, v in load("text_feats.json").items()}
        self.clip_kb = load("clip_features.json")      # per-feature prompt / description / tip
        self.kb = load("knowledge_base.json")          # page content (curated by the team, not expert-reviewed)
        self._clip = None
        self.model_version = "CLIP %s + LogisticRegression (sklearn %s)" % (
            self.meta.get("clip_model", "?"), self.meta.get("sklearn_version", "?"))

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModelService()
        return cls._instance

    def _load_clip(self):
        if self._clip is None:
            import torch
            from transformers import CLIPModel, CLIPProcessor
            name = self.meta.get("clip_model", "openai/clip-vit-base-patch32")
            self._clip = (CLIPModel.from_pretrained(name).eval(), CLIPProcessor.from_pretrained(name), torch)
        return self._clip

    def embed_image(self, pil_img):
        model, proc, torch = self._load_clip()
        with torch.no_grad():
            out = model.get_image_features(**proc(images=pil_img, return_tensors="pt"))
        if not torch.is_tensor(out):
            out = getattr(out, "image_embeds", None) if getattr(out, "image_embeds", None) is not None else out.pooler_output
        v = out[0].numpy().astype(np.float32)
        return v / (np.linalg.norm(v) + 1e-9)

    @staticmethod
    def decode(image_bytes):
        try:
            im = Image.open(io.BytesIO(image_bytes)); im.verify()
            im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise ValueError("Could not decode image. Supported formats: JPG, JPEG, PNG, WEBP.")
        if min(im.size) < 30:
            raise ValueError("Uploaded image is too small. Minimum dimension is 30px.")
        return im

    def analyze(self, image_bytes, target_art_form="warli", language="English", user_note=None, _embedding=None):
        target = (target_art_form or "warli").lower().strip()
        im = self.decode(image_bytes)
        if self.clf is None:
            raise RuntimeError("Model artifact clf.joblib is missing.")
        emb = _embedding if _embedding is not None else self.embed_image(im)

        probs = self.clf.predict_proba([emb])[0]
        prob_dict = {c: round(float(p), 4) for c, p in zip(self.clf.classes_, probs)}
        top = max(prob_dict, key=prob_dict.get)
        info = self.kb.get(target, {})
        name = info.get("name", target.capitalize())
        supported = target in SUPPORTED and target in prob_dict
        target_match = prob_dict.get(target, 0.0) if supported else 0.0

        checks, strengths, improvements = [], [], []
        if supported:
            for f in self.clip_kb.get(target, {}).get("features", []):
                key = "%s/%s" % (target, f["id"]); st = self.feature_stats.get(key, {})
                title = f["id"].replace("_", " ").title()
                if st.get("reliable") and key in self.text_feats:
                    z = (float(emb @ self.text_feats[key]) - st["mean_own"]) / max(st["std_own"], 1e-6)
                    status = "present" if z >= -0.5 else "weak"
                else:
                    status = "unsure"
                checks.append({"id": f["id"], "title": title, "status": status,
                               "description": f["description"], "tip": f["tip"]})
            for c in checks:
                if c["status"] == "present":
                    strengths.append("Tentative visual signal consistent with %s: %s" % (c["title"].lower(), c["description"]))
                elif c["status"] == "weak":
                    improvements.append({"feature": c["title"], "issue": "Tentative signal: %s looks weak in this image" % c["title"].lower(),
                                         "why_it_matters": c["description"], "fix": c["tip"]})
            for c in [c for c in checks if c["status"] == "unsure"][:2]:
                improvements.append({"feature": c["title"], "issue": "Unable to assess this feature reliably",
                                     "why_it_matters": c["description"], "fix": c["tip"]})
            if not strengths:
                strengths.append("No feature could be measured reliably enough to call out a strength.")
            msg = "The classifier's closest match is %s (%.0f%%). This is a style-similarity estimate, not a judgement of quality or authenticity." % (top.capitalize(), prob_dict[top] * 100)
            if top != target:
                msg += " It differs from your selected art form (%s): compare your work with the reference and technique notes." % name
            if prob_dict[top] < 0.5:
                msg += " Confidence is low, so treat this result with caution."
            comment = "Classifier probability for %s: %.0f%%. These are model outputs, not calibrated measures of artistic correctness." % (name, target_match * 100)
        else:
            for c in info.get("key_characteristics", []):
                checks.append({"id": c["id"], "title": c["title"], "status": "manual_review",
                               "description": c["description"], "tip": c["tip"]})
            msg = "%s has no trained classifier yet. Use the curated characteristics below to review your own work." % name
            comment = "Automated analysis covers Madhubani, Warli, Gond and Pattachitra only."

        return {
            "target_art_form": target, "target_name": name, "automated_supported": supported,
            "model_version": self.model_version, "probabilities": prob_dict if supported else {},
            "predicted_art_form": top if supported else None,
            "style_match_score": round(target_match, 2), "overall_score": None,
            "overall_assessment": msg, "style_match_comment": comment,
            "strengths": strengths[:3], "areas_for_improvement": improvements[:3], "feature_checks": checks,
            "next_exercise": info.get("next_exercise", "Practise basic border patterns and single-stroke outlines of this style."),
            "reference_artwork": "/assets/art-forms/%s.jpg" % target, "user_note": user_note, "language": language,
        }

    def chat(self, message, art_form=None, conversation_history=None):
        msg = message.lower().strip()
        art_key = art_form.lower().strip() if art_form else None
        
        # Detect relevant art form from message if not specified
        if not art_key or art_key not in self.kb:
            for k in self.kb.keys():
                if k in msg:
                    art_key = k
                    break
        if not art_key or art_key not in self.kb:
            art_key = "warli"
            
        art_data = self.kb.get(art_key, self.kb.get("warli"))
        art_name = art_data.get("name", "Traditional Indian Art")
        
        # Grounded answer generation using curated knowledge base
        reply = ""
        suggestions = []
        
        if "human" in msg or "figure" in msg or "body" in msg or "stick" in msg:
            reply = f"In {art_name}, human figures are constructed using elemental geometric harmony:\n\n" \
                    f"1. **Torso**: Draw two equilateral triangles meeting at their vertices (inverted points). The upper triangle represents the chest/shoulders, and the lower represents the waist/hips.\n" \
                    f"2. **Head**: Draw a simple circle perched directly on the neck apex without realistic facial features.\n" \
                    f"3. **Limbs**: Use single rhythmic fluid lines for arms and legs, angled at joints to depict action (holding hands, carrying harvest baskets, or playing musical instruments).\n" \
                    f"4. **Proportions**: Maintain a 1:2:2 vertical proportion between head, upper torso, and lower limbs.\n\n" \
                    f"Would you like to practice a Tarpa dance sequence or draw a single standing hunter?"
            suggestions = ["How do I draw a Warli Tarpa dance?", "What brush should I use for fine lines?", "Show me border patterns"]
            
        elif "color" in msg or "palette" in msg or "paint" in msg or "pigment" in msg:
            mats = "\n".join([f"- {m}" for m in art_data.get("materials_and_techniques", [])[:3]])
            reply = f"Traditional {art_name} uses sacred natural pigments:\n\n{mats}\n\n" \
                    f"**Master Tip**: Avoid commercial synthetic acrylics with high gloss. Use matte earthen tones or rice-paste white against a terracotta wash for authentic cultural texture."
            suggestions = ["How do I prepare rice paste for Warli?", "Madhubani natural dyes recipe", "Pancha-Varna 5 sacred colors"]
            
        elif "border" in msg or "frame" in msg or "line" in msg:
            border_feat = next((f for f in art_data.get("key_characteristics", []) if "border" in f["id"] or "frame" in f["id"] or "line" in f["id"]), None)
            tip = border_feat["tip"] if border_feat else "Always draw continuous boundary guidelines before filling internal motifs."
            reply = f"Borders are essential in {art_name} because they frame the sacred visual universe:\n\n" \
                    f"- {tip}\n" \
                    f"- Traditional borders prevent negative energy and focus the viewer's gaze on central storytelling motifs."
            suggestions = ["Double-line border practice", "Common mistakes in borders", "How to draw lotus creepers"]
            
        elif "motifs" in msg or "fish" in msg or "peacock" in msg or "tree" in msg:
            reply = f"Traditional motifs in {art_name} carry deep philosophical symbolism:\n\n" \
                    f"- **Peacock**: Represents divine grace, monsoon rain, and romantic love.\n" \
                    f"- **Fish (Matsya)**: Symbolizes fertility, prosperity, and continuous life water.\n" \
                    f"- **Tree of Life**: Connects the underworld, earth, and heavens in Gond and Warli cosmology.\n" \
                    f"- **Lotus**: Purity blooming above worldly attachments."
            suggestions = ["How to draw a Madhubani peacock", "Gond tree of life patterns", "Warli animals and huts"]
            
        else:
            overview = art_data.get("overview", "")
            quote = art_data.get("quote", "")
            next_ex = art_data.get("next_exercise", "")
            reply = f"{overview}\n\n" \
                    f"> \"{quote}\"\n\n" \
                    f"**Suggested Practice for You**:\n{next_ex}\n\n" \
                    f"What specific technique would you like to master today?"
            suggestions = [f"How to draw {art_name} figures", f"Traditional {art_name} color palette", "Common beginner mistakes"]
            
        return {
            "response": reply,
            "art_form": art_key,
            "art_name": art_name,
            "suggestions": suggestions,
            "references": [f"/assets/art-forms/{art_key}.jpg"]
        }
