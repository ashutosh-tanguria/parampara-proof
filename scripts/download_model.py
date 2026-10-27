"""Download the CLIP weights into the Hugging Face cache so the app can later run offline.

    python scripts/download_model.py            # uses HF_HOME if set
    HF_HUB_OFFLINE=1 uvicorn backend.main:app   # afterwards, no network is needed
"""
import json
from pathlib import Path

from transformers import CLIPModel, CLIPProcessor

meta = json.loads((Path(__file__).resolve().parent.parent / "backend" / "model_meta.json").read_text(encoding="utf-8"))
name = meta["clip_model"]
print("Downloading", name)
CLIPModel.from_pretrained(name)
CLIPProcessor.from_pretrained(name)
print("Done. Set HF_HUB_OFFLINE=1 to run without network access.")
