"""Content, error shapes, health, community, uploads via the API. These run without the CLIP model."""
import io
import json
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

from .conftest import image_bytes, post_image


def test_health_degraded_without_model(client_no_model):
    h = client_no_model.get("/api/health").json()
    assert h["status"] == "degraded" and h["model_loaded"] is False
    assert set(h) == {"status", "version", "model_loaded", "model_state", "clip_model", "sklearn_version", "classes", "model_version", "error"}
    assert h["error"]


def test_art_forms_include_pattachitra_and_six_forms(client_no_model):
    forms = client_no_model.get("/api/art-forms").json()["art_forms"]
    by = {f["slug"]: f for f in forms}
    assert len(forms) == 6 and set(by) == {"madhubani", "warli", "gond", "pattachitra", "kalamkari", "pottery"}
    assert by["pattachitra"]["automated_supported"] is True and by["pattachitra"]["image_slug"] is None
    assert by["kalamkari"]["automated_supported"] is False and by["pottery"]["automated_supported"] is False


def test_art_form_detail_variants(client_no_model):
    c = client_no_model
    assert c.get("/api/art-forms/Warli").status_code == 200  # mixed case
    assert c.get("/api/art-forms/%20GOND%20").status_code == 200
    r = c.get("/api/art-forms/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "art_form_not_found"
    d = c.get("/api/art-forms/pattachitra").json()  # has features missing from other tables (e.g. mythology); must not crash
    assert d["gallery"] == [] and d["image_slug"] is None


def test_unknown_route_is_json_404(client_no_model):
    r = client_no_model.get("/api/does-not-exist")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_lessons_have_no_fake_durations_or_instructors(client_no_model):
    body = client_no_model.get("/api/lessons").json()
    text = json.dumps(body).lower()
    assert all(le["status"] == "coming_soon" for le in body["lessons"])
    for banned in ("duration", "instructor", "master ramesh", "expert"):
        assert banned not in text


def test_credits_are_plain_text(client_no_model):
    body = client_no_model.get("/api/credits").json()
    assert len(body["credits"]) == 179
    assert all("<" not in c["author"] and c["source_url"].startswith("https://commons.wikimedia.org/wiki/") for c in body["credits"])


def test_community_samples_are_tagged_and_like_roundtrip(client_no_model):
    c = client_no_model
    posts = c.get("/api/community").json()["artworks"]
    assert posts and all(p["is_sample"] for p in posts)
    assert not any("Ananya" in json.dumps(p) for p in posts)
    pid = posts[0]["id"]
    assert c.post(f"/api/community/{pid}/like", json={"liked": True}).json()["likes"] == 1
    assert c.post(f"/api/community/{pid}/like", json={"liked": False}).json()["likes"] == 0
    assert c.post(f"/api/community/{pid}/like", json={"liked": False}).json()["likes"] == 0  # never negative
    assert c.post("/api/community/missing/like").status_code == 404


def test_share_artwork_validation(client_no_model):
    c = client_no_model
    assert c.post("/api/artworks", json={"title": "ab", "art_form": "warli"}).status_code == 400
    assert c.post("/api/artworks", json={"title": "A fine title", "art_form": "klingon"}).status_code == 400
    assert c.post("/api/artworks", json={"title": "A fine title", "art_form": "warli", "analysis_id": "0" * 32}).status_code == 400
    r = c.post("/api/artworks", json={"title": "  My \x00 painting  ", "art_form": "Warli"})
    assert r.status_code == 201
    p = r.json()
    assert p["title"] == "My  painting" and p["artist"] == "Guest" and p["is_sample"] is False
    assert c.get("/api/community").json()["artworks"][0]["id"] == p["id"]


def test_portfolio_is_guest_and_private(client_no_model):
    body = client_no_model.get("/api/portfolio").json()
    assert body["user"]["name"] == "Guest" and "analysed" not in body


def test_analysis_unknown_id_is_friendly_404(client_no_model):
    for bad in ("0" * 32, "../../etc/passwd", "short"):
        r = client_no_model.get(f"/api/analysis/{bad}")
        assert r.status_code == 404 and r.json()["error"]["code"] in ("analysis_not_found", "not_found")


# ---- /api/analyze validation (the 400s are raised before the model is needed) -----------------------------------

def test_analyze_missing_and_unknown_art_form(client_no_model):
    c = client_no_model
    data = image_bytes()
    r = c.post("/api/analyze", files={"image": ("a.jpg", data, "image/jpeg")})
    assert r.status_code == 400 and r.json()["error"]["code"] == "art_form_required"
    assert post_image(c, data, art_form="klingon").json()["error"]["code"] == "unknown_art_form"


def test_analyze_missing_file_is_400(client_no_model):
    r = client_no_model.post("/api/analyze", data={"art_form": "warli"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_request"


def test_analyze_rejects_bad_files_with_clear_codes(client_no_model):
    c = client_no_model
    cases = {
        "empty_file": (b"", "image/jpeg", "a.jpg"),
        "unsupported_type": (b"just text", "image/jpeg", "fake.jpg"),
        "unreadable_image": (image_bytes((400, 400))[:300], "image/jpeg", "cut.jpg"),
        "image_too_small": (image_bytes((29, 29)), "image/jpeg", "tiny.jpg"),
    }
    for code, (data, ctype, name) in cases.items():
        r = post_image(c, data, filename=name, content_type=ctype)
        assert r.status_code == 400 and r.json()["error"]["code"] == code, (code, r.text)


def test_analyze_too_large_and_oversized_request(client_no_model, settings):
    c = client_no_model
    big = b"\xff\xd8\xff" + b"0" * (settings.max_upload_bytes + 10)
    r = post_image(c, big)
    assert r.status_code in (400, 413) and r.json()["error"]["code"] in ("file_too_large", "request_too_large")


def test_content_type_is_not_trusted(client_no_model):
    # a real JPEG sent as text/plain is judged by content and accepted up to the model check (503 here)
    r = post_image(client_no_model, image_bytes(), content_type="text/plain", filename="no-extension")
    assert r.status_code == 503 and r.json()["error"]["code"] == "model_unavailable"


def test_weird_file_names_are_harmless(client_no_model):
    names = ["my painting (1).jpg", "चित्र 🎨.jpg", "../../etc/passwd.jpg", "a" * 400 + ".jpg", "C:\\Users\\x\\y.jpg"]
    for n in names:
        r = post_image(client_no_model, image_bytes(), filename=n)
        assert r.status_code == 503, (n, r.text)  # validated fine; stopped only by the missing model


def test_model_unavailable_is_503_json(client_no_model):
    r = post_image(client_no_model, image_bytes())
    assert r.status_code == 503
    body = r.json()["error"]
    assert body["code"] == "model_unavailable" and body["message"].startswith("Analysis is temporarily unavailable.")


def test_rate_limit_on_analyze_and_chat(settings):
    from fastapi.testclient import TestClient

    from backend.main import create_app

    settings.rate_limit_per_min = 3
    with TestClient(create_app(settings, load_model=False)) as c:
        codes = [c.post("/api/chat", json={"message": "hi"}).status_code for _ in range(5)]
        assert codes[:3] == [200, 200, 200] and codes[3:] == [429, 429]
        r = c.post("/api/chat", json={"message": "hi"})
        assert r.json()["error"]["code"] == "rate_limited" and "retry-after" in r.headers


def test_health_not_blocked_by_parallel_requests(client_no_model):
    c = client_no_model
    data = image_bytes((800, 800))
    with ThreadPoolExecutor(8) as ex:
        futures = [ex.submit(post_image, c, data) for _ in range(6)]
        healths = [c.get("/api/health").status_code for _ in range(5)]
        [f.result() for f in futures]
    assert healths == [200] * 5


def test_security_headers_and_request_id(client_no_model):
    r = client_no_model.get("/api/health", headers={"X-Request-ID": "abc123"})
    assert r.headers["x-request-id"] == "abc123"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors" in r.headers["content-security-policy"]


def test_cors_has_no_wildcard(client_no_model):
    r = client_no_model.options("/api/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") != "*"
    assert "access-control-allow-origin" not in r.headers


def test_spa_fallback_and_path_traversal(settings, tmp_path):
    from fastapi.testclient import TestClient

    from backend.main import create_app

    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>", encoding="utf-8")
    (dist / "assets" / "a.js").write_text("1", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("secret", encoding="utf-8")
    settings.dist_dir = dist
    with TestClient(create_app(settings, load_model=False)) as c:
        assert c.get("/art-forms/warli").text == "<html>app</html>"
        assert c.get("/assets/a.js").text == "1"
        assert c.get("/assets/missing.js").status_code == 404
        assert c.get("/api/nope").json()["error"]["code"] == "not_found"
        for p in ("/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt"):
            assert "secret" not in c.get(p).text


def test_uploaded_image_helper_roundtrip():
    # sanity check for the test helper itself
    assert Image.open(io.BytesIO(image_bytes((50, 60)))).size == (50, 60)
