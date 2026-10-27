"""Tests that use the real CLIP model. Behaviour checks are deliberately tolerant: the model is small (see docs/MODEL_CARD.md)."""
import io
import json
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pytest
from PIL import Image

from backend.model_service import ARTWORK_THRESHOLD

from .conftest import SAMPLES, image_bytes, post_image, sample_bytes

pytestmark = pytest.mark.model
CLASSES = ["gond", "madhubani", "pattachitra", "warli"]
EXPECTED = json.loads((SAMPLES / "expected_results.json").read_text(encoding="utf-8"))["samples"]


def load(name):
    return Image.open(SAMPLES / name).convert("RGB")


# ---- unit: classifier and feature logic ------------------------------------------------------------------------
@pytest.mark.parametrize("name", [n for n, v in EXPECTED.items() if v["kind"] == "painting"])
def test_probability_distribution_is_valid(service, name):
    emb = service.embed(load(name))
    assert emb.shape == (512,) and abs(float(np.linalg.norm(emb)) - 1.0) < 1e-4
    probs = service.clf.predict_proba([emb])[0]
    assert len(probs) == 4 and abs(probs.sum() - 1.0) < 1e-6 and (probs >= 0).all()
    assert [str(c) for c in service.clf.classes_] == CLASSES


def test_only_reliable_features_get_present_or_weak(service):
    emb = service.embed(load("sample-warli.jpg"))
    stats = service.feature_stats
    reliable = {k for k, v in stats.items() if v["reliable"]}
    assert reliable == {"warli/white_on_earth", "warli/geometric_figures", "warli/circle_dance", "pattachitra/big_eyes"}
    for key in stats:
        art, fid = key.split("/")
        status = service.feature_status(emb, art, fid)
        if key in reliable:
            assert status in ("present", "weak")
        else:
            assert status == "unsure", key


def test_feature_status_handles_unknown_feature(service):
    emb = service.embed(load("sample-warli.jpg"))
    assert service.feature_status(emb, "pattachitra", "mythology") == "unsure"
    assert service.feature_status(emb, "warli", "no_such_feature") == "unsure"


def test_report_schema_and_no_quality_score(service):
    r = service.analyze_image(load("sample-warli.jpg"), "warli")
    for key in ("target_art_form", "target_name", "automated_supported", "model_version", "probabilities", "predicted_art_form",
                "style_match_score", "overall_score", "overall_assessment", "style_match_comment", "looks_like_artwork",
                "confidence_note", "warnings", "strengths", "areas_for_improvement", "feature_checks", "next_exercise",
                "reference_image_slug"):
        assert key in r, key
    assert r["overall_score"] is None
    assert set(r["probabilities"]) == set(CLASSES) and abs(sum(r["probabilities"].values()) - 1) < 1e-3
    assert {c["status"] for c in r["feature_checks"]} <= {"present", "weak", "unsure"}
    assert r["style_match_score"] == r["probabilities"]["warli"]


def test_pattachitra_and_madhubani_do_not_crash(service):
    for art in ("pattachitra", "madhubani", "gond"):
        r = service.analyze_image(load("sample-madhubani.jpg"), art)
        assert r["automated_supported"] and r["overall_score"] is None and r["feature_checks"]
    assert any("weakest" in w for w in service.analyze_image(load("sample-madhubani.jpg"), "madhubani")["warnings"])


def test_guidance_only_has_no_probabilities(service):
    for art in ("kalamkari", "pottery"):
        r = service.analyze_image(load("sample-kalamkari.jpg"), art)
        assert r["automated_supported"] is False and r["probabilities"] == {} and r["predicted_art_form"] is None
        assert r["feature_checks"] and all(c["status"] == "manual_review" for c in r["feature_checks"])
        assert r["style_match_score"] == 0


def test_low_confidence_note(service):
    emb = service.embed(load("sample-warli.jpg"))
    uniform = np.full(512, 0.0, dtype=np.float32)
    uniform[0] = 1.0  # a degenerate embedding gives a flat, low-confidence distribution
    r = service.analyze_embedding(uniform, "warli", art_prob=0.99)
    top = max(r["probabilities"].values())
    assert ("Low confidence" in r["confidence_note"]) == (top < 0.5)
    assert "Low confidence" not in service.analyze_embedding(emb, "warli", 0.99)["confidence_note"]


# ---- artwork guard -----------------------------------------------------------------------------------------------
def test_guard_separates_junk_from_paintings(service):
    junk = [service.artwork_probability(service.embed(load(n))) for n in ("junk-blank.jpg", "junk-text-document.png")]
    art = [service.artwork_probability(service.embed(load(n))) for n in ("sample-warli.jpg", "sample-madhubani.jpg", "sample-gond.jpg")]
    assert max(junk) < ARTWORK_THRESHOLD < min(art), (junk, art)


def test_junk_has_no_style_estimate(service):
    for n in ("junk-blank.jpg", "junk-text-document.png"):
        r = service.analyze_image(load(n), "warli")
        assert r["looks_like_artwork"] is False and r["probabilities"] == {} and r["feature_checks"] == []


def test_dark_and_blank_images_do_not_crash(service):
    for color in ((0, 0, 0), (255, 255, 255), (128, 128, 128)):
        r = service.analyze_image(Image.new("RGB", (300, 300), color), "warli")
        assert r["overall_score"] is None


# ---- behaviour (tolerant) ------------------------------------------------------------------------------------------
@pytest.mark.tolerant
def test_warli_sample_ranks_warli_first(service):
    r = service.analyze_image(load("sample-warli.jpg"), "warli")
    assert r["predicted_art_form"] == "warli" and r["probabilities"]["warli"] >= 0.5  # observed 0.74


@pytest.mark.tolerant
def test_madhubani_sample_has_madhubani_in_top_two(service):
    # Madhubani is the weakest class (F1 0.49); top-2 is the most we can assert. Observed rank 2.
    r = service.analyze_image(load("sample-madhubani.jpg"), "madhubani")
    ranked = sorted(r["probabilities"], key=r["probabilities"].get, reverse=True)
    assert "madhubani" in ranked[:2]


@pytest.mark.tolerant
@pytest.mark.xfail(reason="Known domain-shift miss: the AI-generated Gond illustration is ranked Madhubani (see sample_data/README.md)", strict=False)
def test_gond_sample_is_recognised_as_gond(service):
    assert service.analyze_image(load("sample-gond.jpg"), "gond")["predicted_art_form"] == "gond"


@pytest.mark.tolerant
def test_wrong_style_submission_scores_lower_than_correct_one(service):
    right = service.analyze_image(load("sample-warli.jpg"), "warli")
    wrong = service.analyze_image(load("sample-warli.jpg"), "madhubani")
    assert wrong["style_match_score"] < right["style_match_score"]
    assert wrong["predicted_art_form"] == "warli" and "differs from your selected art form" in wrong["overall_assessment"]


# ---- API with the model ------------------------------------------------------------------------------------------
def test_health_snapshot_with_model(client):
    h = client.get("/api/health").json()
    assert h["status"] == "ok" and h["model_loaded"] is True
    assert h["classes"] == CLASSES
    assert h["clip_model"] == "openai/clip-vit-base-patch32" and h["sklearn_version"] == "1.6.1" and h["error"] is None
    assert h["model_version"] == "CLIP openai/clip-vit-base-patch32 + LogisticRegression (sklearn 1.6.1)"
    assert set(h) == {"status", "version", "model_loaded", "model_state", "clip_model", "sklearn_version", "classes", "model_version", "error"}


def test_analyze_end_to_end_and_fetch_by_id(client, settings):
    r = post_image(client, sample_bytes("sample-warli.jpg"), filename="../../evil name ✓.jpg", art_form="Warli", user_note="Tarpa\x00 dance")
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["id"]) == 32 and body["image_url"] == f"/uploads/{body['id']}.jpg"
    assert body["overall_score"] is None and body["user_note"] == "Tarpa dance"
    stored = list(settings.upload_dir.iterdir())
    assert [p.name for p in stored] == [f"{body['id']}.jpg"]  # random id, no user-provided file name
    assert client.get(f"/api/analysis/{body['id']}").json()["id"] == body["id"]
    img = client.get(body["image_url"])
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"


def test_duplicate_upload_creates_two_records(client):
    data = sample_bytes("sample-warli.jpg")
    a, b = post_image(client, data).json(), post_image(client, data).json()
    assert a["id"] != b["id"]


def test_pattachitra_selection_works(client):
    r = post_image(client, sample_bytes("sample-madhubani.jpg"), art_form="pattachitra")
    assert r.status_code == 200 and r.json()["reference_image_slug"] is None


def test_kalamkari_and_pottery_via_api(client):
    for art in ("kalamkari", "pottery"):
        body = post_image(client, sample_bytes("sample-kalamkari.jpg"), art_form=art).json()
        assert body["automated_supported"] is False and body["probabilities"] == {}


def test_junk_via_api(client):
    body = post_image(client, sample_bytes("junk-text-document.png"), filename="doc.png", content_type="image/png").json()
    assert body["looks_like_artwork"] is False and body["probabilities"] == {}


def test_rgb_variants_through_api(client):
    for mode, fmt in (("L", "JPEG"), ("CMYK", "JPEG"), ("RGBA", "PNG"), ("P", "PNG")):
        buf = io.BytesIO()
        Image.new(mode, (300, 300)).save(buf, fmt)
        r = post_image(client, buf.getvalue(), filename=f"x.{fmt.lower()}")
        assert r.status_code == 200, (mode, r.text)


def test_analysis_expires_after_cleanup(client, settings):
    body = post_image(client, image_bytes((300, 300))).json()
    client.app.state.analyses.purge_older_than(3600, now=time.time() + 7200)
    assert client.get(f"/api/analysis/{body['id']}").status_code == 404


def test_attach_analysis_to_community_post(client):
    body = post_image(client, image_bytes((300, 300))).json()
    post = client.post("/api/artworks", json={"title": "My practice", "art_form": "warli", "analysis_id": body["id"]}).json()
    assert post["image_url"] == body["image_url"]


def test_concurrent_uploads_do_not_block_health(client):
    data = image_bytes((300, 300))
    with ThreadPoolExecutor(6) as ex:
        futures = [ex.submit(post_image, client, data) for _ in range(4)]
        t0 = time.perf_counter()
        healths = [client.get("/api/health") for _ in range(5)]
        elapsed = time.perf_counter() - t0
        results = [f.result() for f in futures]
    assert all(h.status_code == 200 for h in healths) and all(r.status_code == 200 for r in results)
    assert elapsed < 10  # health is answered while inference runs in worker threads


def test_inference_timeout_returns_504(settings, service):
    from fastapi.testclient import TestClient

    from backend.main import create_app

    settings.analyze_timeout_s = 0.001
    with TestClient(create_app(settings, service=service)) as c:
        r = post_image(c, image_bytes((300, 300)))
        assert r.status_code == 504 and r.json()["error"]["code"] == "timeout"
