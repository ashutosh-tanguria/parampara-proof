import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.config import load_settings  # noqa: E402
from backend.main import create_app  # noqa: E402
from backend.model_service import Knowledge, ModelService  # noqa: E402

SAMPLES = ROOT / "sample_data"


@pytest.fixture()
def settings(tmp_path):
    s = load_settings()
    s.upload_dir = tmp_path / "uploads"
    s.rate_limit_per_min = 0  # disabled unless a test enables it
    s.data_dir = tmp_path / "data"
    s.dist_dir = tmp_path / "no-dist"
    return s


@pytest.fixture(scope="session")
def service():
    """The real model, loaded once. Skips model tests if the CLIP weights are unavailable."""
    settings = load_settings()
    try:
        svc = ModelService(settings.model_dir, Knowledge(settings.model_dir))
        svc.load_clip()
    except Exception as e:  # pragma: no cover - environment dependent
        pytest.skip(f"CLIP model not available: {e}")
    return svc


@pytest.fixture()
def client(settings, service):
    with TestClient(create_app(settings, service=service)) as c:
        yield c


@pytest.fixture()
def client_no_model(settings):
    """API running without a model: content works, /api/analyze answers 503 after validating the upload."""
    with TestClient(create_app(settings, load_model=False)) as c:
        yield c


def image_bytes(size=(256, 256), mode="RGB", fmt="JPEG", color=(180, 90, 60), **save_kwargs) -> bytes:
    im = Image.new(mode, size, color if mode in ("RGB", "RGBA") else 128)
    buf = io.BytesIO()
    im.save(buf, fmt, **save_kwargs)
    return buf.getvalue()


def post_image(client, data: bytes, filename="art.jpg", content_type="image/jpeg", art_form="warli", **extra):
    return client.post("/api/analyze", files={"image": (filename, data, content_type)}, data={"art_form": art_form, **extra})


def sample_bytes(name: str) -> bytes:
    return (SAMPLES / name).read_bytes()
