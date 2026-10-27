"""Print the not-a-painting guard probability and the classifier output for every image in sample_data/.

Used to pick ARTWORK_THRESHOLD in backend/model_service.py:
    python scripts/calibrate_guard.py [extra_image ...]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from PIL import Image  # noqa: E402

from backend.config import load_settings  # noqa: E402
from backend.model_service import ARTWORK_THRESHOLD, Knowledge, ModelService  # noqa: E402

settings = load_settings()
svc = ModelService(settings.model_dir, Knowledge(settings.model_dir))
svc.load_clip()
paths = sorted((ROOT / "sample_data").glob("*.[jp][pn]g")) + [Path(p) for p in sys.argv[1:]]
print(f"threshold = {ARTWORK_THRESHOLD}")
print(f"{'file':32} {'artwork_p':>9}  probabilities")
for p in paths:
    im = Image.open(p).convert("RGB")
    emb = svc.embed(im)
    probs = svc.clf.predict_proba([emb])[0]
    pr = " ".join(f"{c}={v:.2f}" for c, v in zip(svc.clf.classes_, probs))
    print(f"{p.name:32} {svc.artwork_probability(emb):9.3f}  {pr}")
